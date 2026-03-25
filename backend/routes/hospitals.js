const express = require('express');
const router = express.Router();
const db = require('../db');

// Initial hospitals data to preload
const initialHospitals = [
    { name: "City General Hospital", location: "Downtown", beds_available: 5 },
    { name: "Sunrise Medical Center", location: "Westside", beds_available: 8 },
    { name: "Apollo Care", location: "Eastside", beds_available: 4 },
    { name: "Green Valley Hospital", location: "North Hills", beds_available: 10 },
    { name: "Metro Health", location: "South District", beds_available: 6 }
];

// Preload hospitals (Utility endpoint)
router.post('/preload', async (req, res) => {
    try {
        const countQuery = await db.query('SELECT COUNT(*) FROM hospitals');
        const count = parseInt(countQuery.rows[0].count, 10);

        if (count === 0) {
            // Insert initial data
            const insertPromises = initialHospitals.map(h => 
                db.query(
                    'INSERT INTO hospitals (name, location, beds_available) VALUES ($1, $2, $3)',
                    [h.name, h.location, h.beds_available]
                )
            );
            await Promise.all(insertPromises);
            res.status(201).json({ message: 'Hospitals preloaded successfully' });
        } else {
            res.status(200).json({ message: 'Hospitals already exist' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get all hospitals
router.get('/', async (req, res) => {
    try {
        // Auto-preload if empty
        const countQuery = await db.query('SELECT COUNT(*) FROM hospitals');
        const count = parseInt(countQuery.rows[0].count, 10);

        if (count === 0) {
            const insertPromises = initialHospitals.map(h => 
                db.query(
                    'INSERT INTO hospitals (name, location, beds_available) VALUES ($1, $2, $3)',
                    [h.name, h.location, h.beds_available]
                )
            );
            await Promise.all(insertPromises);
        }
        
        const hospitalsQuery = await db.query('SELECT * FROM hospitals ORDER BY id ASC');
        // Map beds_available to bedsAvailable for frontend compatibility if needed
        const hospitals = hospitalsQuery.rows.map(row => ({
            _id: row.id, // Map for frontend compatibility
            id: row.id,
            name: row.name,
            location: row.location,
            bedsAvailable: row.beds_available
        }));
        
        res.status(200).json(hospitals);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Book a single bed
router.put('/:id/book', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid hospital ID' });
        }

        const hospitalQuery = await db.query('SELECT * FROM hospitals WHERE id = $1', [id]);
        
        if (hospitalQuery.rows.length === 0) {
            return res.status(404).json({ message: 'Hospital not found' });
        }
        
        const hospital = hospitalQuery.rows[0];

        if (hospital.beds_available > 0) {
            const updateResult = await db.query(
                'UPDATE hospitals SET beds_available = beds_available - 1 WHERE id = $1 RETURNING beds_available',
                [id]
            );
            const newBedsAvailable = updateResult.rows[0].beds_available;
            res.status(200).json({ message: 'Bed booked successfully', bedsAvailable: newBedsAvailable });
        } else {
            res.status(400).json({ message: 'No beds available to book' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
