/** Inclusive calendar-day bounds in Asia/Jakarta (UTC+7, no DST). */
export function dayRange(
	from?: string,
	to?: string
): { gte?: Date; lte?: Date } | undefined {
	const gte = from ? new Date(`${from}T00:00:00+07:00`) : undefined;
	const lte = to ? new Date(`${to}T23:59:59.999+07:00`) : undefined;
	if (!gte && !lte) return undefined;
	return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
}
