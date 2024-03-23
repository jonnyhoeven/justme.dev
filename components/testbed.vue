<script>

</script>
<template>
  <div class="container_row">
      <div class="listImagebg layerbg"></div>
      <div class="listImage layerimg" style="background-image: url(http://localhost:5173/images/gitops-workshop.png)"></div>
    <div class="layercontent">
      <a href="http://localhost:5173/" style="text-decoration:none; color:inherit;">


      </a>
    </div>
  </div>
  <div class="container_row">
    <div class="listImagebg layerbg"></div>
    <div class="listImage layerimg" style="background-image: url(http://localhost:5173/images/gitops-workshop.png)"></div>
    <div class="layercontent">
      <a href="http://localhost:5173/" style="text-decoration:none; color:inherit;">

      </a>

    </div>
  </div>
</template>

<style>

.container_row {
  display: grid;
  margin: 20pt 0 40pt 0;
}

.layerbg, .layerimg {
  grid-column: 1;
  grid-row: 1;
}

.layercontent {
  grid-column: 2;
  grid-row: 1;
}

.listImage {
  width: 200pt; /*or 70%, or what you want*/
  height: 110pt; /*or 70%, or what you want*/
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 5pt;
  margin: 0 20pt 0 0;
  border: 1px solid var(--vp-c-brand-soft);
}

.listImagebg {
  width: 200pt; /*or 70%, or what you want*/
  height: 110pt; /*or 70%, or what you want*/
  background-image: linear-gradient(-28deg, rgb(15, 196, 93) 50%, rgb(34, 188, 238) 50%);
  filter: blur(40pt);
  z-index: -10;
}


</style>