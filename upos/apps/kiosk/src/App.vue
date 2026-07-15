<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="w-screen h-screen overflow-hidden flex items-center justify-center" style="background: #F0F0F5">
    <div class="w-full h-full overflow-hidden p-3" style="background: #F0F0F5">
      <div class="w-full h-full rounded-[28px] overflow-hidden flex flex-col" style="background: #F0F0F5; border: 1px solid #E0E0E5; box-shadow: 0 24px 64px rgba(18,100,227,.15), 0 4px 16px rgba(0,0,0,.08)">
        <RouterView />
      </div>
    </div>
  </div>
</template>
