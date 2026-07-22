export function registerQuestControls() {
  AFRAME.registerComponent('desktop-right-drag-look', {
    dependencies: ['look-controls'],
    init() {
      this.dragging = false;
      this.lastX = 0;
      this.lastY = 0;
      this.rotate = (deltaYaw, deltaPitch) => {
        if (this.el.sceneEl.is('vr-mode')) return;
        const lookControls = this.el.components['look-controls'];
        if (!lookControls?.yawObject || !lookControls?.pitchObject) return;
        lookControls.yawObject.rotation.y += deltaYaw;
        lookControls.pitchObject.rotation.x = Math.max(
          -1.3,
          Math.min(1.3, lookControls.pitchObject.rotation.x + deltaPitch)
        );
      };
      this.onPointerDown = (event) => {
        if (event.button !== 2 || this.el.sceneEl.is('vr-mode')) return;
        this.dragging = true;
        this.lastX = event.clientX;
        this.lastY = event.clientY;
        event.preventDefault();
      };
      this.onPointerMove = (event) => {
        if (!this.dragging) return;
        const deltaX = event.clientX - this.lastX;
        const deltaY = event.clientY - this.lastY;
        this.lastX = event.clientX;
        this.lastY = event.clientY;
        this.rotate(-deltaX * 0.003, -deltaY * 0.003);
      };
      this.onPointerUp = (event) => {
        if (event.button === 2) this.dragging = false;
      };
      this.onKeyDown = (event) => {
        const increments = {
          ArrowLeft: [0.12, 0],
          ArrowRight: [-0.12, 0],
          ArrowUp: [0, 0.09],
          ArrowDown: [0, -0.09]
        };
        const increment = increments[event.key];
        if (!increment || this.el.sceneEl.is('vr-mode')) return;
        this.rotate(...increment);
        event.preventDefault();
      };
      this.onContextMenu = (event) => event.preventDefault();
      this.attachCanvas = () => {
        this.canvas = this.el.sceneEl.canvas;
        this.canvas?.addEventListener('pointerdown', this.onPointerDown);
        this.canvas?.addEventListener('contextmenu', this.onContextMenu);
      };
      if (this.el.sceneEl.canvas) this.attachCanvas();
      else this.el.sceneEl.addEventListener('render-target-loaded', this.attachCanvas, { once: true });
      window.addEventListener('pointermove', this.onPointerMove);
      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('keydown', this.onKeyDown);
    },
    remove() {
      this.canvas?.removeEventListener('pointerdown', this.onPointerDown);
      this.canvas?.removeEventListener('contextmenu', this.onContextMenu);
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
      window.removeEventListener('keydown', this.onKeyDown);
    }
  });

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
