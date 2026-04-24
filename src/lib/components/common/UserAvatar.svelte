<script lang="ts">
        export let name: string = '';
        export let size: number = 32;
        export let src: string = '';

        $: initials = name ? name.slice(0, 2).toUpperCase() : '?';
        $: fontSize = size * 0.33;
</script>

<div
        style="width: {size}px; height: {size}px; flex-shrink: 0; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background-color: #f1c40e;"
>
        <span
                style="font-family: ui-sans-serif, system-ui, sans-serif; font-weight: 200; font-size: {fontSize}px; color: #ffffff; letter-spacing: 0.02em; line-height: 1; text-align: center; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;"
        >{initials}</span>
</div>
