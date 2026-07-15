<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="w-screen h-screen overflow-hidden flex items-center justify-center" style="background: #D9DEE5">
    <div class="w-full max-w-[430px] md:max-w-[720px] lg:max-w-[1100px] h-full overflow-hidden p-3" style="background: #D9DEE5">
      <div class="w-full h-full rounded-2xl overflow-hidden flex flex-col bg-white" style="border: 1px solid #E0E0E0; box-shadow: 0 1px 4px rgba(0,0,0,0.08)">
        <RouterView />
      </div>
    </div>
  </div>
</template>
