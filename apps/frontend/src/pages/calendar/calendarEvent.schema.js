import Joi from 'joi';
import dayjs from 'dayjs';

const requiredDayjs = (message) =>
  Joi.any()
    .required()
    .custom((value, helpers) => {
      if (value === null || value === undefined || !dayjs.isDayjs(value) || !value.isValid()) {
        return helpers.message(message);
      }

      return value;
    }, 'Dayjs required validation')
    .messages({
      'any.required': message
    });

const optionalDayjs = Joi.any()
  .allow(null)
  .custom((value, helpers) => {
    if (value === null || value === undefined) {
      return value;
    }

    if (!dayjs.isDayjs(value) || !value.isValid()) {
      return helpers.message('Neplatna hodnota datumu alebo casu');
    }

    return value;
  }, 'Dayjs optional validation');

export const calendarEventSchema = Joi.object({
  id: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null).optional(),
  title: Joi.string().trim().required().messages({
    'string.empty': 'Nazov eventu je povinny',
    'any.required': 'Nazov eventu je povinny'
  }),
  date: requiredDayjs('Datum eventu je povinny'),
  endDate: Joi.when('allDay', {
    is: true,
    then: requiredDayjs('Datum do je povinny').custom((value, helpers) => {
      const { date } = helpers.state.ancestors[0];

      if (date && dayjs(value).isBefore(dayjs(date), 'day')) {
        return helpers.message('Datum do musi byt rovnaky alebo neskorsi ako datum od');
      }

      return value;
    }, 'All-day end date validation'),
    otherwise: optionalDayjs
  }),
  startTime: Joi.when('allDay', {
    is: false,
    then: requiredDayjs('Zaciatocny cas je povinny'),
    otherwise: optionalDayjs
  }),
  endTime: Joi.when('allDay', {
    is: false,
    then: requiredDayjs('Koncovy cas je povinny').custom((value, helpers) => {
      const { startTime } = helpers.state.ancestors[0];

      if (startTime && !dayjs(value).isAfter(dayjs(startTime))) {
        return helpers.message('Koncovy cas musi byt neskor ako zaciatocny cas');
      }

      return value;
    }, 'Timed event end time validation'),
    otherwise: optionalDayjs
  }),
  allDay: Joi.boolean().required(),
  studentGroup: Joi.string().allow('').optional(),
  location: Joi.string().allow('').optional(),
  description: Joi.string().allow('').optional(),
  createdBy: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null).optional(),
  color: Joi.string().required().messages({
    'string.empty': 'Farba eventu je povinna',
    'any.required': 'Farba eventu je povinna'
  })
});