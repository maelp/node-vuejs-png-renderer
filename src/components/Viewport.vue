<template>
  <div
    id="main-screenshot-viewport"
    :style="{
      width: `${width}px`,
      ...(height > 0 ? { height: `${height}px` } : {}),
      padding: `${padding}px`,
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }"
  >
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  width: {
    type: Number,
    default: 800,
  },
  height: {
    type: Number,
    default: 0,
  },
  padding: {
    type: Number,
    default: 0,
  },
});
</script>
