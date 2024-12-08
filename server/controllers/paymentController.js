const PaymentModel = require('../models/Payment');
const BookingModel = require('../models/Booking');
const path = require('path');
const fs = require('fs');
const bookingController = require('./bookingController');

const paymentController = {
    processPayment: async (req, res) => {
        try {
            const { payment_code, amount } = req.body;

            const payment = await PaymentModel.findOne({ payment_code });
            if (!payment) {
                return res.status(404).json({ message: 'Payment code not found' });
            }

            if (payment.payment_status === 'Paid') {
                return res.status(400).json({ message: 'Payment has already been processed.' });
            }

            const now = new Date();
            if (payment.payment_code_expiry <= now) {
                await BookingModel.findByIdAndDelete(payment.booking_id);
                await PaymentModel.findByIdAndDelete(payment._id);
                return res.status(400).json({ message: 'Payment code expired. Booking has been canceled.' });
            }

            if (amount !== payment.total_amount) {
                return res.status(400).json({ message: 'Invalid payment amount. Payment must be exact.' });
            }

            payment.payment_status = 'Paid'
            payment.receipt_status = 'Paid'
            payment.payment_date = now;
            await payment.save();

            if (payment.payment_status === 'Paid') {
                const receiptsDir = path.join('receipts');
                const pendingReceiptPath = path.join(receiptsDir, "receipt-${payment._id}.pdf");

                if (fs.existsSync(pendingReceiptPath)) {
                    fs.unlinkSync(pendingReceiptPath);
                }
            }

            const booking = await BookingModel.findById(payment.booking_id);
            if (booking) {
                booking.status = 'Confirmed';
                await booking.save();
            }

            await bookingController.generateReceipt(booking._id, payment._id, 'Paid');

            await paymentController.removePendingReceipts();

            return res.status(200).json({
                message: 'Payment processed successfully',
                payment
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    },

    deleteAllPayments: async (req, res) => {
        try {
            // Ambil semua pembayaran dari database
            const payments = await PaymentModel.find();

            if (!payments || payments.length === 0) {
                return res.status(404).json({ message: 'No payments found to delete' });
            }

            const receiptsDir = path.join(__dirname, '../../receipts');

            for (const payment of payments) {
                const receiptPath = path.join(receiptsDir, `receipt-${payment._id}.pdf`);

                // Cek apakah file receipt ada dan hapus
                if (fs.existsSync(receiptPath)) {
                    fs.unlinkSync(receiptPath);
                    console.log(`Deleted receipt file: ${receiptPath}`);
                }
            }

            // Hapus semua data pembayaran dari database
            const deletedPayments = await PaymentModel.deleteMany({});

            return res.status(200).json({
                message: 'All payments and their associated receipt files have been deleted successfully',
                deletedCount: deletedPayments.deletedCount,
            });
        } catch (error) {
            console.error('Error deleting all payments and receipts:', error.message);
            return res.status(500).json({ message: 'Failed to delete all payments and receipts' });
        }
    },

    removePendingReceipts: async () => {
        try {
            const receiptsDir = path.join('receipts');
            const files = fs.readdirSync(receiptsDir);

            for (const file of files) {
                const filePath = path.join(receiptsDir, file);
                const paymentId = file.split('-')[1].split('.')[0];
                const payment = await PaymentModel.findById(paymentId);

                if (payment && payment.payment_status !== 'Paid') {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted receipt file: ${file}`);
                }
            }
        } catch (error) {
            console.error('Error deleting pending receipts:', error.message);
        }
    },

    downloadReceipt: async (req, res) => {
        try {
            const { paymentId } = req.params;

            const payment = await PaymentModel.findById(paymentId);
            if (!payment || payment.payment_status !== 'Paid') {
                return res.status(404).json({ message: 'Paid receipt not found' });
            }

            const pdfPath = path.join('receipts', `receipt-${payment._id}.pdf`);
            console.log('PDF Path:', pdfPath);
            if (!fs.existsSync(pdfPath)) {
                return res.status(404).json({ message: 'Receipt file not found' });
            }

            res.download(pdfPath, `receipt-${payment._id}.pdf`);
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ message: 'Error downloading receipt' });
        }
    },

    getAllPayments: async (req, res) => {
        try {
            // Ambil semua data booking dari database
            const payment = await PaymentModel.find();

            // Jika tidak ada data booking
            if (!payment || payment.length === 0) {
                return res.status(404).json({ message: 'No payments found' });
            }

            // Kirim respon dengan data booking
            return res.status(200).json({
                message: 'payment retrieved successfully',
                payment
            });
        } catch (error) {
            // Tangani error dan kirim respon error
            console.error(error.message);
            return res.status(500).json({ message: 'Error retrieving payments' });
        }
    }
};

module.exports = paymentController;