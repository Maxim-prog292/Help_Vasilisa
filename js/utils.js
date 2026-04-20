window.Utils = {
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  formatMeters(value) {
    return `${Math.max(0, Math.round(value))} м`;
  }
};
