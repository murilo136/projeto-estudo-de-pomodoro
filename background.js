let targetTabId = null;
let workTimeTotal = 0;
let restTimeTotal = 0;
let cyclesCompleted = 0;
let currentCycle = 0;
let isWorkPhase = true;
let timerInterval = null;

let awayStartTime = null; // Quando você saiu da aba alvo
let alertInterval = null; // Intervalo para mostrar notificações

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startPomodoro") {
    targetTabId = message.tabId;
    startPomodoroTimer(message.workTime, message.restTime, message.cycles);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!targetTabId) return;

  if (activeInfo.tabId === targetTabId) {
    // Voltou para a aba alvo
    awayStartTime = null;
    if (alertInterval) {
      clearInterval(alertInterval);
      alertInterval = null;
    }
  } else {
    // Saiu da aba alvo, marcar tempo de saída
    if (!awayStartTime) {
      awayStartTime = Date.now();

      // Começa a verificar depois de 5 segundos
      setTimeout(() => {
        if (!awayStartTime) return; // Já voltou

        alertInterval = setInterval(() => {
          const elapsed = Date.now() - awayStartTime;

          if (elapsed >= 5 * 1000 && elapsed <= 2 * 60 * 1000) {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icon.png',
              title: '⏰ Volte para a guia foco!',
              message: 'Você está fora da guia selecionada. Volte para manter o foco!',
              priority: 2
            });
          } else if (elapsed > 2 * 60 * 1000) {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icon.png',
              title: '⚠️ Atenção!',
              message: 'Você está fora da guia foco há mais de 2 minutos!',
              priority: 2
            });
            clearInterval(alertInterval);
            alertInterval = null;
          }
        }, 15 * 1000); // Notificar a cada 15 segundos
      }, 5 * 1000); // Espera 5 segundos antes de começar a avisar
    }
  }
});

async function startPomodoroTimer(workTime, restTime, totalCycles) {
  clearInterval(timerInterval);

  workTimeTotal = 0;
  restTimeTotal = 0;
  cyclesCompleted = 0;
  currentCycle = 1;
  isWorkPhase = true;

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: '⏱️ Pomodoro iniciado!',
    message: `Foco por ${workTime / 60} minutos. Boa sorte!`,
    priority: 2
  });

  timerInterval = setInterval(async () => {
    if (!targetTabId) return;

    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (currentTab && currentTab.id === targetTabId) {
      if (isWorkPhase) {
        workTimeTotal++;
      } else {
        restTimeTotal++;
      }

      if (isWorkPhase && workTimeTotal >= workTime) {
        isWorkPhase = false;
        restTimeTotal = 0;

        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: '⏸️ Tempo de descanso!',
          message: `Ciclo ${currentCycle} concluído. Hora de descansar por ${restTime / 60} minutos.`,
          priority: 2
        });
      } else if (!isWorkPhase && restTimeTotal >= restTime) {
        isWorkPhase = true;
        workTimeTotal = 0;
        currentCycle++;
        cyclesCompleted++;

        if (currentCycle > totalCycles) {
          clearInterval(timerInterval);
          showProductivityReport();
          targetTabId = null;
          return;
        }

        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: '🎯 Volte ao trabalho!',
          message: `Ciclo ${currentCycle} iniciado. Foque por ${workTime / 60} minutos.`,
          priority: 2
        });
      }
    }
  }, 1000);
}

function showProductivityReport() {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Relatório de Produtividade',
    message: `Você completou ${cyclesCompleted} ciclos.\nTempo de trabalho total: ${(workTimeTotal / 60).toFixed(2)} minutos.\nTempo de descanso total: ${(restTimeTotal / 60).toFixed(2)} minutos.`,
    priority: 2
  });

  chrome.storage.local.get(["totalWorkTime", "totalRestTime", "totalCycles"], (data) => {
    let newWorkTime = (data.totalWorkTime || 0) + workTimeTotal;
    let newRestTime = (data.totalRestTime || 0) + restTimeTotal;
    let newCycles = (data.totalCycles || 0) + cyclesCompleted;

    chrome.storage.local.set({
      totalWorkTime: newWorkTime,
      totalRestTime: newRestTime,
      totalCycles: newCycles
    });
  });
}
