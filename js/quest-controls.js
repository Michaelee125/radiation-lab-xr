export function registerQuestControls() {
  AFRAME.registerComponent('controller-help-feedback', {
    init() {
      this.onConnected = () => {
        const status = document.getElementById('controller-status');
        status?.setAttribute('text', 'value', 'Quest controllers connected — point + trigger');
      };
      this.el.addEventListener('controllerconnected', this.onConnected);
    },
    remove() {
      this.el.removeEventListener('controllerconnected', this.onConnected);
    }
  });
}
