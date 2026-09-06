const LINKEDIN_PROFILE_HOSTS = new Set(['linkedin.com', 'www.linkedin.com']);
const LINKEDIN_PROFILE_PATH = /^\/in\/([^/]+)\/?$/i;

export const LINKEDIN_PROFILE_ERROR = 'Enter a valid LinkedIn profile URL, such as https://www.linkedin.com/in/your-name.';

/**
 * Validates and normalizes an optional LinkedIn profile URL.
 * Returns an empty string for a blank value and null for an invalid value.
 */
export function normalizeLinkedInProfileUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.length > 300) return null;

    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;

    try {
        const url = new URL(candidate);
        const pathMatch = url.pathname.match(LINKEDIN_PROFILE_PATH);

        if (
            url.protocol !== 'https:' ||
            !LINKEDIN_PROFILE_HOSTS.has(url.hostname.toLowerCase()) ||
            url.username ||
            url.password ||
            url.port ||
            !pathMatch
        ) {
            return null;
        }

        return `https://www.linkedin.com/in/${pathMatch[1]}`;
    } catch {
        return null;
    }
}
