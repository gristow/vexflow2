// Vex Flow
// Mohit Muthanna <mohit@muthanna.com>
//
// A rendering context for the Raphael backend.
//
// Copyright Mohit Cheppudira 2010

/** @constructor */
Vex.Flow.CanvasContext = (function() {
  function CanvasContext(context) {
    if (arguments.length > 0) this.init(context);
  }

  CanvasContext.prototype = {
    init: function(context) {
      // Use a name that is unlikely to clash with a canvas context
      // property
      this.vexFlowCanvasContext = context;
    },

    clear: function() {
      this.vexFlowCanvasContext.clearRect(0, 0,
        this.vexFlowCanvasContext.canvas.width, this.vexFlowCanvasContext.canvas.height);
    },

    setFont: function(family, size, weight) {
      this.vexFlowCanvasContext.font = (weight || "") + " " + size + "pt " + family;
      return this;
    },

    setFillStyle: function(style) {
      this.vexFlowCanvasContext.fillStyle = style;
      return this;
    },

    setBackgroundFillStyle: function(style) {
      this.background_fillStyle = style;
      return this;
    },

    setStrokeStyle: function(style) {
      this.vexFlowCanvasContext.strokeStyle = style;
      return this;
    },

    setShadowColor: function(style) {
      this.vexFlowCanvasContext.shadowColor = style;
      return this;
    },

    setShadowBlur: function(blur) {
      this.vexFlowCanvasContext.shadowBlur = blur;
      return this;
    },

    setLineWidth: function(width) {
      this.vexFlowCanvasContext.lineWidth = width;
      return this;
    },

    scale: function(x, y) {
      return this.vexFlowCanvasContext.scale(x, y);
    },

    resize: function(width, height) {
      return this.vexFlowCanvasContext.resize(width, height); },

    rect: function(x, y, width, height) {
      return this.vexFlowCanvasContext.rect(x, y, width, height);
    },

    fillRect: function(x, y, width, height) {
      return this.vexFlowCanvasContext.fillRect(x, y, width, height);
    },

    clearRect: function(x, y, width, height) {
      return this.vexFlowCanvasContext.clearRect(x, y, width, height);
    },

    beginPath: function() {
      return this.vexFlowCanvasContext.beginPath();
    },

    moveTo: function(x, y) {
      return this.vexFlowCanvasContext.moveTo(x, y);
    },

    lineTo: function(x, y) {
      return this.vexFlowCanvasContext.lineTo(x, y);
    },

    bezierCurveTo: function(x1, y1, x2, y2, x, y) {
      return this.vexFlowCanvasContext.bezierCurveTo(x1, y1, x2, y2, x, y);
    },

    quadraticCurveTo: function(x1, y1, x, y) {
      return this.vexFlowCanvasContext.quadraticCurveTo(x1, y1, x, y);
    },

    // This is an attempt (hack) to simulate the HTML5 canvas
    // arc method.
    arc: function(x, y, radius, startAngle, endAngle, antiClockwise) {
      return this.vexFlowCanvasContext.arc(x, y, radius, startAngle, endAngle, antiClockwise);
    },

    // Adapted from the source for Raphael's Element.glow
    glow: function() {
      return this.vexFlowCanvasContext.glow();
    },

    fill: function() {
      return this.vexFlowCanvasContext.fill();
    },

    stroke: function() {
      return this.vexFlowCanvasContext.stroke();
    },

    closePath: function() {
      return this.vexFlowCanvasContext.closePath();
    },

    measureText: function(text) {
      return this.vexFlowCanvasContext.measureText(text);
    },

    fillText: function(text, x, y) {
      return this.vexFlowCanvasContext.fillText(text, x, y);
    },

    save: function() {
      return this.vexFlowCanvasContext.save();
    },

    restore: function() {
      return this.vexFlowCanvasContext.restore();
    }
  };

  return CanvasContext;
}());