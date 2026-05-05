/* ============================================================
   PULSE CHAT — Utility Functions
   ============================================================ */

const PulseUtils = (() => {
    /**
     * Generate a consistent HSL color from a nickname string.
     * Same nickname always produces the same color.
     */
    function generateAvatarColor(nickname) {
        let hash = 0;
        for (let i = 0; i < nickname.length; i++) {
            hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 65%, 55%)`;
    }

    /**
     * Get initials from nickname (first 2 characters).
     */
    function getInitials(nickname) {
        return nickname.substring(0, 2).toUpperCase();
    }

    /**
     * Format a timestamp into a readable time string.
     * Shows relative time if recent, otherwise shows date + time.
     */
    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMs / 3600000);

        if (diffMin < 1) return 'agora';
        if (diffMin < 60) return `${diffMin}min`;
        if (diffHr < 24) return `${diffHr}h`;

        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    /**
     * Basic HTML sanitization to prevent XSS.
     */
    function sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Smooth scroll an element to the bottom.
     */
    function scrollToBottom(element) {
        requestAnimationFrame(() => {
            element.scrollTop = element.scrollHeight;
        });
    }

    /**
     * Check if a container is scrolled near the bottom
     * (within 150px tolerance).
     */
    function isNearBottom(element) {
        const threshold = 150;
        return (element.scrollHeight - element.scrollTop - element.clientHeight) < threshold;
    }

    /**
     * Format date for message dividers (e.g., "Hoje", "Ontem", "05/04").
     */
    function formatDateDivider(isoString) {
        const date = new Date(isoString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Hoje';
        if (date.toDateString() === yesterday.toDateString()) return 'Ontem';

        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }

    return {
        generateAvatarColor,
        getInitials,
        formatTimestamp,
        sanitizeHTML,
        scrollToBottom,
        isNearBottom,
        formatDateDivider,
    };
})();
