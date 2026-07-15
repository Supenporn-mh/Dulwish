<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="w-screen h-screen overflow-hidden flex items-center justify-center" style="background: #D9DEE5">
    <div class="w-full max-w-[430px] h-full overflow-hidden p-4" style="background: #D9DEE5">
      <div class="w-full h-full rounded-[24px] overflow-hidden flex flex-col bg-white p-2" style="border: 1px solid #D8DCE3; box-shadow: 0 8px 24px rgba(20,30,50,0.14)">
        <RouterView />
      </div>
    </div>
  </div>
</template>
