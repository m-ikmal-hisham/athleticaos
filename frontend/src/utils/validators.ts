import * as z from 'zod';

export const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/** Tournament livestream links as edited in the tournament forms. Blank rows are allowed (dropped on save). */
export const livestreamLinksSchema = z
    .array(z.object({ label: z.string().nullable().optional(), url: z.string() }))
    .max(10, 'At most 10 livestream links')
    .superRefine((links, ctx) => {
        if (links.some(link => link.url.trim() && !/^https?:\/\/\S+$/i.test(link.url.trim()))) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Each link must be a full web address starting with https://' });
        }
    })
    .optional();
