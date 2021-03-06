const mongoose = require('mongoose');
const requireLogin = require('../middlewares/requireLogin');
const requireCredits = require('../middlewares/requireCredits');
const Mailer = require('../services/Mailer');
const surveyTemplate = require('../services/emailTemplate/surveyTemplate');

const Survey = mongoose.model('surveys');

module.exports = (app) => {

    app.get('/api/surveys', requireLogin , async (req, res) => {
        const surveys = await Survey.find({ _user: req.user.id }).select({ recipients: false });
        res.send(surveys);
    });

    app.get('/api/surveys/recipients', requireLogin , async (req, res) => {
        const surveyRecipients = await Survey.find({ _user: req.user.id }).select({ recipients: true });
        res.send(surveyRecipients);
    });


    app.post('/api/surveys', requireLogin , requireCredits , async (req, res) => {
        
        const { title, subject, body, recipients } = req.body;

        const survey = new Survey({
            title,
            subject,
            body,
            recipients: recipients.split(',').map(email => ({ email: email.trim() })),
            _user: req.user.id,
            dateSent: Date.now()
        });

        // Great place to send email
        const mailer = new Mailer(survey, surveyTemplate(survey));
        try {
            await mailer.send();
            await survey.save();
            req.user.credits -= 1;
            const user = await req.user.save();

            res.send(user);
        } catch(err) {
            res.send(422).send(err);
        }
    });
}