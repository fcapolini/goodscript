<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);

const increment = (): void => {
  count.value += 1;
};
</script>

<template>
  <div>
    <h1>Vue + GoodScript</h1>
    <p>Count: {{ count }}</p>
    <button @click="increment" type="button">Increment</button>
  </div>
</template>
