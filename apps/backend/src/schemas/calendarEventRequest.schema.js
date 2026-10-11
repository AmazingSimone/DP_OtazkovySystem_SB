const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Neplatne ID',
  'string.empty': 'ID je povinne',
  'any.required': 'ID je povinne'
});

const baseSchema = {
  title: Joi.string().trim().min(1).messages({
    'string.empty': 'Nazov eventu je povinny',
    'any.required': 'Nazov eventu je povinny'
  }),
  date: Joi.date().iso().messages({
    'date.base': 'Datum eventu je povinny',
    'date.format': 'Datum eventu je povinny'
  }),
  endDate: Joi.when('allDay', {
    is: true,
    then: Joi.date().iso().messages({
      'date.base': 'Datum do je povinny',
      'date.format': 'Datum do je povinny'
    }),
    otherwise: Joi.any().allow(null).optional()
  }),
  startTime: Joi.when('allDay', {
    is: false,
    then: Joi.date().iso().messages({
      'date.base': 'Zaciatocny cas je povinny',
      'date.format': 'Zaciatocny cas je povinny'
    }),
    otherwise: Joi.any().allow(null).optional()
  }),
  endTime: Joi.when('allDay', {
    is: false,
    then: Joi.date().iso().messages({
      'date.base': 'Koncovy cas je povinny',
      'date.format': 'Koncovy cas je povinny'
    }),
    otherwise: Joi.any().allow(null).optional()
  }),
  allDay: Joi.boolean().required().messages({
    'boolean.base': 'Celodenny event musi byt boolean',
    'any.required': 'Celodenny event je povinny'
  }),
  studentGroup: Joi.string().allow('').trim().optional(),
  location: Joi.string().allow('').trim().optional(),
  description: Joi.string().allow('').trim().optional(),
  color: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Farba eventu je povinna',
    'any.required': 'Farba eventu je povinna'
  })
};

const createCalendarEventSchema = Joi.object(baseSchema);

const updateCalendarEventSchema = Joi.object({
  title: Joi.string().trim().min(1).messages({
    'string.empty': 'Nazov eventu nemoze byt prazdny'
  }),
  date: Joi.date().iso().messages({
    'date.base': 'Neplatny datum eventu',
    'date.format': 'Neplatny datum eventu'
  }),
  endDate: Joi.date().iso().allow(null).messages({
    'date.base': 'Neplatny datum do',
    'date.format': 'Neplatny datum do'
  }),
  startTime: Joi.date().iso().allow(null).messages({
    'date.base': 'Neplatny zaciatocny cas',
    'date.format': 'Neplatny zaciatocny cas'
  }),
  endTime: Joi.date().iso().allow(null).messages({
    'date.base': 'Neplatny koncovy cas',
    'date.format': 'Neplatny koncovy cas'
  }),
  allDay: Joi.boolean().messages({
    'boolean.base': 'Celodenny event musi byt boolean'
  }),
  studentGroup: Joi.string().allow('').trim(),
  location: Joi.string().allow('').trim(),
  description: Joi.string().allow('').trim(),
  color: Joi.string().trim().min(1).messages({
    'string.empty': 'Farba eventu nemoze byt prazdna'
  }),
  createdBy: objectId
});

module.exports = {
  createCalendarEventSchema,
  updateCalendarEventSchema
};