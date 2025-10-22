const Fastify = require('fastify')
const fetch = require('node-fetch')
const dotenv = require('dotenv')

dotenv.config()

const app = Fastify()

app.post('/ticket', async (req, res) => {
    const { summary, description, email, phone } = req.body
    const response = await fetch(`${process.env.BASE_URL}/rest/servicedeskapi/request`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_TOKEN}`).toString('base64')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            serviceDeskId: process.env.JIRA_DESK_ID,
            requestTypeId: process.env.JIRA_REQ_TYPE_ID,
            requestFieldValues: {
                summary,
                description,
                "customfield_10223": email,
                "customfield_10224": phone
            },
            "raiseOnBehalfOf": email
        })
    })
    const data = await response.json();
    return data
})

app.post('/webhook', async (req, res) => {
    console.log('Jira webhook:', req.body)

    const { action, id, key, status, email, phone, comment } = req.body;

    switch (action) {
        case 'CREATED':
            console.log(`Ticket ${key} created and will be assigned someone soon.\n\nView Ticket: ${process.env.SHORT_BASE_URL}${key}\n\n${process.env.MESSAGE_FOOTER}`);
            break;
        case 'UPDATED':
            console.log(`Ticket ${key} updated to status ${status}.\n\nView Ticket: ${process.env.SHORT_BASE_URL}${key}\n\n${process.env.MESSAGE_FOOTER}`);
            break;
        case 'COMMENTED':
            if(req.body.internal) break; // Ignore internal comments
            console.log(`New comment on ticket ${key}: ${comment}.\n\nView Ticket: ${process.env.SHORT_BASE_URL}${key}\n\n${process.env.MESSAGE_FOOTER}`);
            break;
        case 'ASSIGNED':
            if(req.body.assignee === '') break; // Ignore unassignments
            console.log(`Ticket ${key} has been assigned to ${req.body.assignee}.\n\nView Ticket: ${process.env.SHORT_BASE_URL}${key}\n\n${process.env.MESSAGE_FOOTER}`);
            break;
        default:
            console.log(`Ticket ${key} has been updated.\n\nView Ticket: ${process.env.SHORT_BASE_URL}${key}\n\n${process.env.MESSAGE_FOOTER}`);
            break;
    }

    res.send({ ok: true })
})

// New: redirect short link /p/:key to the Atlassian portal
app.get('/p/:key', async (req, res) => {
    const { key } = req.params;
    const dest = `${process.env.BASE_URL}/servicedesk/customer/portal/${process.env.JIRA_DESK_ID}/${encodeURIComponent(key)}`;
    // 302 redirect to the external portal
    return res.redirect(dest);
})

app.listen({ port: 3000, host: '0.0.0.0' })
