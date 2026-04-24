<script lang="ts">
        export let name = '';
        export let size = 32;
        export let color: string | null = null;
        export let variant: 'outline' | 'solid' = 'solid';

        $: initials = name
                .split(' ')
                .map((word) => word[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

        $: bgColor = color || stringToColor(name);

        function stringToColor(str: string): string {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                        hash = str.charCodeAt(i) + ((hash << 5) - hash);
                }
                const colors = [
                        '#667eea',
                        '#764ba2',
                        '#f093fb',
                        '#4facfe',
                        '#00f2fe',
                        '#43e97b',
                        '#38f9d7',
                        '#fa709a',
                        '#fee140',
                        '#30cfd0'
                ];
                return colors[Math.abs(hash % colors.length)];
        }

        $: variantClass = variant === 'outline' 
                ? 'border-2 bg-transparent text-current border-current'
                : 'bg-current text-white';
</script>

<div
        class="flex items-center justify-center rounded-full font-semibold flex-shrink-0 {variantClass}"
        style="width: {size}px; height: {size}px; {variant === 'solid' ? `background-color: ${bgColor};` : `border-color: ${bgColor}; color: ${bgColor};`} font-size: {Math.max(size * 0.4, 12)}px;"
>
        {initials || '?'}
</div>
