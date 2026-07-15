<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="w-screen h-screen overflow-hidden flex items-center justify-center" style="background: #D9DEE5">
    <div class="w-full max-w-[430px] h-full overflow-hidden bg-white">
      <RouterView />
    </div>
  </div>
</template>
