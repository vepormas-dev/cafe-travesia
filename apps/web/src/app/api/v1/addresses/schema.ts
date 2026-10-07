import { z } from 'zod';
import { addressSchema } from '@travesia/shared';

export const addressInputSchema = addressSchema.extend({
  label: z.string().trim().max(60).optional(),
  isDefault: z.boolean().optional(),
});
export const addressPatchSchema = addressInputSchema.partial();
