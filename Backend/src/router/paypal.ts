import { Router } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { ApiError, CheckoutPaymentIntent, Client, Environment, LogLevel, OrdersController, OrderStatus, PayeePaymentMethodPreference, PaypalExperienceUserAction } from '@paypal/paypal-server-sdk';
import { Account, DatabaseInvoice, SubscriptionTypes } from 'src/utils/types';
import { z } from 'zod';

const database = Database.getDatabase();

export const router = Router();

function getPayPalClient() {
    const client = new Client({
        clientCredentialsAuthCredentials: {
            oAuthClientId: process.env.PAYPAL_OAUTH_CLIENT_ID,
            oAuthClientSecret: process.env.PAYPAL_OAUTH_CLIENT_SECRET,
        },
        timeout: 0,
        environment: Environment.Sandbox,
        logging: {
            logLevel: LogLevel.Info,
            logRequest: {
                logBody: true
            },
            logResponse: {
                logHeaders: true
            }
        },
    });

    const ordersController = new OrdersController(client);

    return {
        client, ordersController
    };
}

router.get('/api/v1/paypal/test', async (req, res) => {
    res.send('Working');
});

router.post('/api/v1/paypal/captureOrder', async (req, res) => {
    const bodyData = z.object({
        invoiceID: z.string(),
        orderID: z.string(),
    });
    const reqData = bodyData.parse(req.body);
    const { invoiceID, orderID } = reqData;
    console.log('Cpaturing Order for invoice', invoiceID, 'with OrderID', orderID);
    if (invoiceID == null || typeof invoiceID != 'string' || invoiceID.trim().length == 0) {
        res.status(500).json({ error: 'Invoice ID is required' });
    }
    if (orderID == null || typeof orderID != 'string' || orderID.trim().length == 0) {
        res.status(500).json({ error: 'Order ID is required' });
    }

    const invoice = await database.get<DatabaseInvoice>('invoices').getOne({ ID: invoiceID });

    if (invoice == null) {
        res.status(500).json({ error: 'Invoice not found' });
        return;
    }

    if (invoice.paypalOrderID != orderID) {
        res.status(500).json({ error: 'Order ID does not match' });
        return;
    }

    const { ordersController } = getPayPalClient();

    const { result: order } = await ordersController.getOrder({ id: invoice.paypalOrderID });


    console.log(
        order
    );
    const payer = order.payer;
    const paymentSource = order.paymentSource;

    if (order.intent !== CheckoutPaymentIntent.Capture) {
        res.status(500).json({ error: 'Order is not for capture' });
        return;
    }
    if (order.status == OrderStatus.Approved || order.status == OrderStatus.Completed) {
        await database.get<DatabaseInvoice>('invoices').update({ ID: invoiceID }, {
            status: 'PAID',
            paidAt: Date.now(),
        });

        console.log('Invoice paid', invoiceID, invoice);

        const [invoiceActionIntent, invoiceActionData] = invoice.action.split(':');

        console.log('Invoice action intent', { invoiceActionIntent, invoiceActionData });

        if (invoiceActionIntent == 'setRank') {
            await database.get<Account>('accounts').update({ UUID: invoice.userUUID }, { subscription_type: invoiceActionData as SubscriptionTypes, last_renewed: Date.now() });
        }

        res.json({ status: 'PAID' });
        return;
    } else if (order.status == OrderStatus.PayerActionRequired || order.status == OrderStatus.Voided || order.status == OrderStatus.Created) {
        await database.get<DatabaseInvoice>('invoices').update({ ID: invoiceID }, {
            status: 'FAILED',
        });
        res.json({ status: 'FAILED' });
        return;
    }

});

router.post('/api/v1/paypal/createOrder', async (req, res) => {
    const bodyData = z.object({
        invoiceID: z.string(),
    });
    const reqData = bodyData.parse(req.body);
    const { invoiceID } = reqData;
    console.log('Creating Order for invoice', invoiceID);
    if (invoiceID == null || typeof invoiceID != 'string' || invoiceID.trim().length == 0) {
        res.status(500).json({ error: 'Invoice ID is required' });
    }

    const invoice = await database.get<DatabaseInvoice>('invoices').getOne({ ID: invoiceID });

    if (invoice == null) {
        res.status(500).json({ error: 'Invoice not found' });
        return;
    }

    const { ordersController } = getPayPalClient();

    try {
        const { result, ...httpResponse } = await ordersController.createOrder({
            body: {
                intent: CheckoutPaymentIntent.Capture,
                purchaseUnits: [
                    {
                        items: [
                            {
                                name: 'Twitch Stream Downloader Prepaid',
                                quantity: '1',
                                unitAmount: {
                                    currencyCode: 'EUR',
                                    value: invoice.amount.toString(),
                                }
                            }
                        ],
                        amount: {
                            breakdown: {
                                itemTotal: {
                                    currencyCode: 'EUR',
                                    value: invoice.amount.toString(),
                                }
                            },
                            currencyCode: 'EUR',
                            value: invoice.amount.toString(),
                        },
                    }
                ],
                paymentSource: {
                    paypal: {
                        experienceContext: {
                            // returnUrl: 'http://localhost:7877/paypal/return',
                            cancelUrl: 'http://localhost:7877/paypal/cancel',
                            userAction: PaypalExperienceUserAction.PayNow,
                            paymentMethodPreference: PayeePaymentMethodPreference.ImmediatePaymentRequired
                        }
                    }
                },
            },
            prefer: 'return=minimal'
        });
        console.log('result', result);

        await database.get<DatabaseInvoice>('invoices').update({ ID: invoiceID }, {
            paypalOrderID: result.id,
            status: 'PENDING',
        });
        res.json({
            orderID: result.id,
            links: result.links,
        });
    } catch (error) {
        if (error instanceof ApiError) {
            const errors = error.result;
            // const { statusCode, headers } = error;
            console.log('error', error);
            res.status(500).json(error);

        }
    }
});