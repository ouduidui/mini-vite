<template>
  <div class="container">
    <h1>{{ msg }}</h1>
    <p @click="addCount">{{ count }}</p>
  </div>
</template>

<script>
  import { ref } from 'vue';
  export default {
    data() {
      return {
        msg: 'HelloWorld'
      };
    },
    setup() {
      const count = ref(0);

      const addCount = () => {
        count.value++;
      };

      return {
        count,
        addCount
      };
    }
  };
</script>
