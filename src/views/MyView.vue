<template>
  <div class="bg-gray-100">
    <!-- This is just for development visibility -->
    <div id="view-content" class="w-full inline-block">
      <!-- This wrapper ensures tight bounds -->
      <Card :title="`Welcome ${username}`">
        <p class="mb-4">You have {{ itemCount }} items in your cart</p>
        <Button>Click me!</Button>
      </Card>
    </div>
  </div>
</template>

<script setup>
import Card from "../components/Card.vue";
import Button from "../components/Button.vue";

defineProps({
  username: {
    type: String,
    default: "Guest",
  },
  itemCount: {
    type: Number,
    default: 0,
  },
});
</script>
