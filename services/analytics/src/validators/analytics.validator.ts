import Joi from 'joi';

export const analyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  schoolId: Joi.string().uuid().optional(),
  instructorId: Joi.string().uuid().optional(),
  studentId: Joi.string().uuid().optional(),
});

export const validateAnalyticsQuery = (data: any) => {
  return analyticsQuerySchema.validate(data);
};
