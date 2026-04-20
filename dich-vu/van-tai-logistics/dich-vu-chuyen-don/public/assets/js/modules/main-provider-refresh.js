function createProviderAutoRefreshController(window, options = {}) {
  const intervalMs = Math.max(10000, Number(options?.intervalMs || 60000));
  const onTick =
    typeof options?.onTick === "function" ? options.onTick : async () => {};
  const shouldPause =
    typeof options?.shouldPause === "function" ? options.shouldPause : () => false;

  let timerId = 0;
  let inFlight = false;
  let running = false;

  function stop() {
    running = false;
    if (timerId) {
      window.clearTimeout(timerId);
      timerId = 0;
    }
  }

  function scheduleNext() {
    if (!running) return;

    timerId = window.setTimeout(async function tick() {
      if (!running) return;

      const isHidden = !!window.document?.hidden;
      if (isHidden || inFlight || shouldPause()) {
        scheduleNext();
        return;
      }

      inFlight = true;
      try {
        await onTick();
      } finally {
        inFlight = false;
        scheduleNext();
      }
    }, intervalMs);
  }

  function start() {
    stop();
    running = true;
    scheduleNext();
  }

  return {
    start,
    stop,
  };
}

const providerRefreshModule = {
  createProviderAutoRefreshController,
};

export { createProviderAutoRefreshController };
export default providerRefreshModule;
