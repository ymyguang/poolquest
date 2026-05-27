import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 8787);
const DEMO_HOLD_SECONDS = Number(process.env.DEMO_HOLD_SECONDS || 8);

const runs = new Map();

const defaultPrivateQuest = {
  id: 'dragon-pool-v01',
  theme: 'Dragon Pool',
  agentName: 'Dragon Agent',
  poolPair: 'DRAGON / QUSD',
  openingProphecy:
    '巨龙盘踞在金山之上。“献上第一缕烟，披上沉默的鳞，握住金子后别急着飞走。等火焰低头，门会自己打开。”',
  publicStages: ['烟雾', '龙鳞', '金币', '火焰', '宝藏'],
  hiddenSolution: [
    {
      action: 'donate',
      success: '烟升起来了。巨龙闻到了你不是空手而来。',
      near: '烟雾靠近了龙鼻，但它还在分辨你的来意。'
    },
    {
      action: 'addLp',
      success: '鳞片覆盖了你的手。火不会立刻认出你。',
      near: '有什么东西像盔甲，但它还没有披到身上。'
    },
    {
      action: 'buy',
      success: '你拿起了金币。现在，别让金币的声音太急。',
      near: '金光闪过，龙的眼皮动了一下。'
    },
    {
      action: 'hold',
      waitSeconds: DEMO_HOLD_SECONDS,
      success: '火焰低下了头。门缝里有金光。',
      near: '火焰仍在抬头。等待比多走一步更重要。'
    },
    {
      action: 'sell',
      success: 'Dragon Treasure 已开启。副本通关。',
      near: '宝藏听见脚步声，但门闩还没有落下。'
    }
  ],
  hints: {
    1: [
      '第一道影子不是交易本身，而是让龙知道你带来了贡品。',
      '有些保护不是买来的，是把自己放进池水里换来的。',
      '金币可以拿起，但拿起后不能立刻离场。',
      '现在的问题不是多做一步，而是让时间完成一步。',
      '门已经松动，带走一部分金色回声。'
    ],
    2: [
      '让烟先升起来，再考虑披上什么。',
      '龙鳞来自你和池子的共同承诺。',
      '你需要先握住副本 Token，才能触发火焰的考验。',
      '让火焰安静下来需要时间。',
      '最后一步像离开市场，但不是仓皇逃跑。'
    ],
    3: [
      '献祭会唤醒第一枚符文。',
      '提供 LP 会让第二枚符文贴上皮肤。',
      '买入 DRAGON 后不要立刻卖出。',
      `等待约 ${DEMO_HOLD_SECONDS} 秒，火焰会低头。链上正式规则是 180 秒。`,
      '火焰低头后卖出部分 DRAGON，宝藏会开启。'
    ]
  }
};

let privateQuest = defaultPrivateQuest;

const publicQuest = (quest = privateQuest) => ({
  id: quest.id,
  theme: quest.theme,
  agentName: quest.agentName,
  poolPair: quest.poolPair,
  openingProphecy: quest.openingProphecy,
  publicStages: quest.publicStages,
  actions: [
    { id: 'donate', label: 'Donate', lore: '献祭' },
    { id: 'addLp', label: 'Add LP', lore: '入池' },
    { id: 'removeLp', label: 'Remove LP', lore: '撤池' },
    { id: 'buy', label: 'Buy DRAGON', lore: '买入' },
    { id: 'sell', label: 'Sell DRAGON', lore: '卖出' },
    { id: 'hold', label: 'Hold', lore: '等待' }
  ],
  note: 'Hidden solution is held server-side. Public API never returns the concrete action order.'
});

const newRun = () => ({
  id: crypto.randomUUID(),
  questId: privateQuest.id,
  active: true,
  completed: false,
  progress: 0,
  startedAt: Date.now(),
  boughtAt: null,
  hintCount: 0,
  actionCount: 0,
  hintPenalty: 0,
  cursePenalty: 0,
  score: 0,
  qusd: 99,
  dragon: 25,
  feedback: '门打开了。你只得到预言，没有得到路线。',
  log: ['Run started. Hidden Hook rule loaded server-side.']
});

const publicRun = (run) => ({
  ...run,
  stageStatuses: privateQuest.publicStages.map((_, index) => {
    if (run.completed && index === privateQuest.publicStages.length - 1) return 'complete';
    if (index < run.progress) return 'done';
    if (run.progress === 3 && index === 3) return 'danger';
    return 'locked';
  })
});

const append = (run, feedback) => {
  run.feedback = feedback;
  run.log = [feedback, ...run.log].slice(0, 8);
};

const hintQuote = (run, level) => {
  const baseFee = level === 1 ? 0.2 : level === 2 ? 0.6 : 1.5;
  const basePenalty = level === 1 ? 50 : level === 2 ? 150 : 400;
  const repeat = [1, 1.5, 2.5, 4][run.hintCount] || 6;
  const progress = run.progress <= 1 ? 1 : run.progress === 2 ? 1.5 : run.progress === 3 ? 2 : run.progress === 4 ? 3 : 5;
  return { fee: baseFee * repeat * progress, penalty: Math.round(basePenalty * repeat * progress) };
};

const scoreRun = (run) => {
  const completion = 1000;
  const time = Math.max(0, Math.round(300 * (1 - (Date.now() - run.startedAt) / 900_000)));
  const efficiency = run.actionCount <= 5 ? 300 : run.actionCount === 6 ? 250 : run.actionCount === 7 ? 200 : 100;
  return completion + time + efficiency + run.hintPenalty + run.cursePenalty;
};

const applyAction = (run, action) => {
  if (!run.active || run.completed) {
    append(run, '这局 Run 已经结束。重新入场才能继续。');
    return;
  }

  run.actionCount += 1;
  const expected = privateQuest.hiddenSolution[run.progress];

  if (action === 'askHint') return;

  if (action === 'sell' && run.progress === 3 && run.boughtAt && Date.now() - run.boughtAt < 60_000) {
    run.cursePenalty -= 300;
    append(run, '金币还烫着，急着离开的人会被火记住。');
    return;
  }

  if (!expected || action !== expected.action) {
    const near = privateQuest.hiddenSolution.find((step) => step.action === action)?.near;
    append(run, near || '这一步搅动了池水，但 Hook 没有承认它属于当前符文。');
    return;
  }

  if (expected.action === 'hold') {
    const unlockAt = (run.boughtAt || 0) + expected.waitSeconds * 1000;
    if (Date.now() < unlockAt) {
      append(run, expected.near);
      return;
    }
  }

  if (action === 'donate') run.qusd -= 1;
  if (action === 'addLp') {
    run.qusd -= 10;
    run.dragon -= 5;
  }
  if (action === 'buy') {
    run.qusd -= 12;
    run.dragon += 12;
    run.boughtAt = Date.now();
  }
  if (action === 'sell') {
    run.dragon = Math.max(0, run.dragon - 8);
    run.qusd += 8;
  }

  run.progress += 1;
  append(run, expected.success);

  if (run.progress >= privateQuest.hiddenSolution.length) {
    run.completed = true;
    run.active = false;
    run.score = scoreRun(run);
  }
};

const generateQuestWithModel = async (prompt) => {
  if (!process.env.LLM_ENDPOINT || !process.env.LLM_API_KEY) return defaultPrivateQuest;

  const response = await fetch(process.env.LLM_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.LLM_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'quest-generator',
      messages: [
        {
          role: 'system',
          content:
            'Generate one PoolQuest hidden AMM quest as strict JSON. Include publicStages, openingProphecy, hiddenSolution with actions chosen from donate/addLp/removeLp/buy/sell/hold, and hints levels 1-3. Do not reveal solution in public copy.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return defaultPrivateQuest;
  return JSON.parse(content);
};

const readJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const send = (response, status, payload) => {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  response.end(JSON.stringify(payload));
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') return send(response, 204, {});
    const url = new URL(request.url || '/', `http://${request.headers.host}`);

    if (request.method === 'GET' && url.pathname === '/api/quest/current') {
      return send(response, 200, { quest: publicQuest() });
    }

    if (request.method === 'POST' && url.pathname === '/api/quest/generate') {
      const body = await readJson(request);
      privateQuest = await generateQuestWithModel(body.prompt || 'Create a Dragon Pool quest.');
      runs.clear();
      return send(response, 200, { quest: publicQuest(privateQuest) });
    }

    if (request.method === 'POST' && url.pathname === '/api/run/start') {
      const run = newRun();
      runs.set(run.id, run);
      return send(response, 200, { run: publicRun(run) });
    }

    if (request.method === 'POST' && url.pathname === '/api/run/action') {
      const body = await readJson(request);
      const run = runs.get(body.runId);
      if (!run) return send(response, 404, { error: 'Run not found' });
      applyAction(run, body.action);
      return send(response, 200, { run: publicRun(run) });
    }

    if (request.method === 'POST' && url.pathname === '/api/run/hint') {
      const body = await readJson(request);
      const run = runs.get(body.runId);
      if (!run) return send(response, 404, { error: 'Run not found' });
      const level = Number(body.level);
      if (![1, 2, 3].includes(level)) return send(response, 400, { error: 'Invalid hint level' });
      const quote = hintQuote(run, level);
      const text = privateQuest.hints[level][Math.min(run.progress, privateQuest.hints[level].length - 1)];
      run.hintCount += 1;
      run.hintPenalty -= quote.penalty;
      run.dragon = Math.max(0, run.dragon - quote.fee);
      append(run, text);
      return send(response, 200, { run: publicRun(run), quote });
    }

    return send(response, 404, { error: 'Not found' });
  } catch (error) {
    return send(response, 500, { error: error instanceof Error ? error.message : 'Internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`PoolQuest backend listening on http://localhost:${PORT}`);
});
