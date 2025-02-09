<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h3 class="text-xl font-bold mb-4">{{ title }}</h3>
    <div class="card-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
});
</script>
