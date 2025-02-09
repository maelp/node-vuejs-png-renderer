<template>
  <div
    id="main-viewport"
    :style="{
      width: `${width}px`,
      height: `${height}px`,
      padding: `${padding}px`,
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }"
  >
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: "Viewport",
  props: {
    width: {
      type: Number,
      default: 800,
    },
    height: {
      type: Number,
      default: 600,
    },
    padding: {
      type: Number,
      default: 0,
    },
  },
};
</script>
