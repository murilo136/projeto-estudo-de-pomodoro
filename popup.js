document.getElementById('start').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    const workTime = parseInt(document.getElementById('work-time').value, 10);
    const restTime = parseInt(document.getElementById('rest-time').value, 10);
    const cycles = parseInt(document.getElementById('cycles').value, 10);
  
    if (!workTime || !restTime || !cycles) {
      alert('Por favor, preencha todos os campos com valores válidos.');
      return;
    }
  
    chrome.runtime.sendMessage({
      action: "startPomodoro",
      tabId: tab.id,
      workTime: workTime * 60,
      restTime: restTime * 60,
      cycles: cycles
    });
  
    window.close();
  });
  
  // Atualiza relatório no popup
  function updateReport() {
    chrome.storage.local.get(["totalWorkTime", "totalRestTime", "totalCycles"], (data) => {
      document.getElementById('work-time-report').textContent = ((data.totalWorkTime || 0) / 60).toFixed(2);
      document.getElementById('rest-time-report').textContent = ((data.totalRestTime || 0) / 60).toFixed(2);
      document.getElementById('cycles-report').textContent = data.totalCycles || 0;
    });
  }
  
  updateReport();
  