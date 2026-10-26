export interface FlashToast {
    type?: 'success' | 'error' | 'warning' | 'info';
    message: string;
    description?: string;
}