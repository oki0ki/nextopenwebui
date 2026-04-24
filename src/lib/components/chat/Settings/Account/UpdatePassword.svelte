<script lang="ts">
                import { toast } from '$lib/notification';

        let currentPassword = '';
        let newPassword = '';
        let newPasswordConfirm = '';

        const updatePasswordHandler = async () => {
                if (newPassword === newPasswordConfirm) {
                        currentPassword = '';
                        newPassword = '';
                        newPasswordConfirm = '';
                } else {
                        toast.error(
                                `The passwords you entered don't quite match. Please double-check and try again.`
                        );
                        newPassword = '';
                        newPasswordConfirm = '';
                }
        };
</script>

<form
        class="flex flex-col gap-2.5 text-sm"
        on:submit|preventDefault={() => {
                updatePasswordHandler();
        }}
>
        <div class="flex flex-col gap-1">
                <p class="text-[13px] text-gray-400 dark:text-gray-500">{'Bieżące hasło'}</p>
                <input
                        class="w-full rounded-xl py-2 px-3.5 text-[14px] bg-gray-100 dark:bg-[#3a3a3c] dark:text-gray-200 outline-none"
                        type="password"
                        bind:value={currentPassword}
                        autocomplete="current-password"
                        required
                />
        </div>

        <div class="flex flex-col gap-1">
                <p class="text-[13px] text-gray-400 dark:text-gray-500">{'Nowe hasło'}</p>
                <input
                        class="w-full rounded-xl py-2 px-3.5 text-[14px] bg-gray-100 dark:bg-[#3a3a3c] dark:text-gray-200 outline-none"
                        type="password"
                        bind:value={newPassword}
                        autocomplete="new-password"
                        required
                />
        </div>

        <div class="flex flex-col gap-1">
                <p class="text-[13px] text-gray-400 dark:text-gray-500">{'Potwierdź hasło'}</p>
                <input
                        class="w-full rounded-xl py-2 px-3.5 text-[14px] bg-gray-100 dark:bg-[#3a3a3c] dark:text-gray-200 outline-none"
                        type="password"
                        bind:value={newPasswordConfirm}
                        autocomplete="off"
                        required
                />
        </div>

        <div class="flex justify-end pt-0.5">
                <button
                        class="text-[13px] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-full px-3.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                        {'Aktualizacja hasła'}
                </button>
        </div>
</form>
