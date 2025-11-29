require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const app = express();
const PORT = 3000;


const prisma = new PrismaClient();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));

// Handling request from clients

// Handling registration form submission
app.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, dateOfBirth, gender, phone, role } = req.body;

        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ error: 'All required fields must be filled' });
        }

        const newUser = await prisma.users.create({ // Add instance to Users table
            data: {
                first_name: firstName,
                last_name: lastName,
                email: email,
                password_hash: password,
                date_of_birth: dateOfBirth ? new Date(dateOfBirth) : null,
                gender: gender,
                phone: phone,
                role: role,
            }
        });

        console.log('New user created:', newUser);
        res.json({ 
            success: true, 
            message: 'User registered successfully!',
            userId: newUser.user_id 
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Email already exists' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Handling login form submission
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email
        const user = await prisma.users.findUnique({
            where: { email: email }
        });

        // Check if user exists
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Check if password matches (in real app, use proper password hashing!)
        if (user.password_hash !== password) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        console.log('User logged in:', user.email);
        
        // Determine redirect URL based on role
        let redirectUrl;
        switch (user.role) {
            case 'member':
                redirectUrl = '/member-dashboard.html';
                break;
            case 'trainer':
                redirectUrl = '/trainer-dashboard.html';
                break;
            case 'admin':
                redirectUrl = '/admin-dashboard.html';
                break;
            default:
                redirectUrl = '/';
        }

        res.json({ 
            success: true, 
            message: 'Login successful!',
            redirectUrl: redirectUrl,
            user: {
                id: user.user_id,
                name: `${user.first_name} ${user.last_name}`,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get member profile data
app.post('/api/member/profile', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Get user basic information
        const user = await prisma.users.findUnique({ //Find one user by user ID
            where: { user_id: parseInt(userId) },
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
                date_of_birth: true,
                gender: true,
                phone: true,
                role: true,
                past_classes_count: true,
                upcoming_sessions_count: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get latest health metric for each type
        const metrics = await prisma.healthMetric.findMany({
            where: { user_id: parseInt(userId) },
            orderBy: { logged_at: "desc" },
            distinct: ["metric_type"]
        });

        const latestMetrics = {};
        metrics.forEach(m => {
            latestMetrics[m.metric_type] = m.current_value;
        });

        
        // Get active fitness goal
        const activeGoal = await prisma.fitnessGoal.findFirst({
            where: { 
                user_id: parseInt(userId),
                is_active: true 
            },
            orderBy: { created_at: 'desc' }
        });

        res.json({
            success: true,
            user: user,
            latestMetrics: latestMetrics,
            activeGoal: activeGoal
        });

    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get dashboard data USING THE VIEW
app.post('/api/member/dashboard', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Interacting with VIEW: member_dashboard_view to retrieve essential dashboard data
        const dashboardData = await prisma.$queryRaw`
            SELECT * FROM member_dashboard_view 
            WHERE user_id = ${parseInt(userId)}
        `;

        if (dashboardData.length === 0) {
            return res.status(404).json({ error: 'User not found in dashboard view' });
        }

        const userData = dashboardData[0];

        // Get active goal separately 
        const activeGoal = await prisma.fitnessGoal.findFirst({ //Find most reent active goal
            where: { 
                user_id: parseInt(userId),
                is_active: true 
            },
            orderBy: { created_at: 'desc' }
        });

        // Calculate progress using data from the VIEW
        let progressData = null;
        if (activeGoal && userData) {
            let currentValue;
            switch(activeGoal.goal_type) {
                case 'target_weight':
                    currentValue = userData.current_weight;
                    break;
                case 'target_body_fat':
                    currentValue = userData.current_body_fat;
                    break;
                case 'target_max_hr':
                    currentValue = userData.current_max_hr;
                    break;
            }

            if (currentValue) {
                progressData = {
                    current: currentValue,
                    target: activeGoal.target_value,
                    progress: activeGoal.target_value - currentValue,
                    percentage: Math.min(100, Math.max(0, (currentValue / activeGoal.target_value) * 100))
                };
            }
        }

        res.json({
            success: true,
            user: {
                user_id: userData.user_id,
                first_name: userData.first_name,
                last_name: userData.last_name,
                email: userData.email,
                past_classes_count: userData.past_classes_count,
                upcoming_sessions_count: userData.upcoming_sessions_count
            },
            metrics: [
                { metric_type: 'weight', current_value: userData.current_weight },
                { metric_type: 'body_fat', current_value: userData.current_body_fat },
                { metric_type: 'max_hr', current_value: userData.current_max_hr }
            ].filter(metric => metric.current_value !== null),
            activeGoal: activeGoal,
            progress: progressData,
            lastLogin: new Date().toLocaleDateString()
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update member profile
app.post('/api/member/update-profile', async (req, res) => {
    try {
        const { userId, firstName, lastName, email, password, dateOfBirth, gender, phone } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Build update object with only provided fields
        const updateData = {};
        if (firstName) updateData.first_name = firstName;
        if (lastName) updateData.last_name = lastName;
        if (email) updateData.email = email;
        if (password) updateData.password_hash = password; // In real app, hash this!
        if (dateOfBirth) updateData.date_of_birth = new Date(dateOfBirth);
        if (gender) updateData.gender = gender;
        if (phone) updateData.phone = phone;

        // Check if any fields to update
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        // Check if email already exists (if email is being updated)
        if (email) {
            const existingUser = await prisma.users.findFirst({
                where: {
                    email: email,
                    NOT: { user_id: parseInt(userId) }
                }
            });
            
            if (existingUser) {
                return res.status(400).json({ error: 'Email already exists' });
            }
        }

        const updatedUser = await prisma.users.update({
            where: { user_id: parseInt(userId) },
            data: updateData,
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
                date_of_birth: true,
                gender: true,
                phone: true,
                role: true
            }
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'User not found' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Add health metric
app.post('/api/member/add-metric', async (req, res) => {
    try {
        const { userId, metricType, metricValue } = req.body;

        if (!userId || !metricType || !metricValue) {
            return res.status(400).json({ error: 'User ID, metric type, and value are required' });
        }

        // Validate metric value is a number
        const numericValue = parseFloat(metricValue);
        if (isNaN(numericValue)) {
            return res.status(400).json({ error: 'Metric value must be a number' });
        }

        // Validate metric type
        const validMetricTypes = ['weight', 'body_fat', 'max_hr'];
        if (!validMetricTypes.includes(metricType)) {
            return res.status(400).json({ error: 'Invalid metric type' });
        }

        const newMetric = await prisma.healthMetric.create({
            data: {
                user_id: parseInt(userId),
                metric_type: metricType,
                current_value: numericValue,
                logged_at: new Date()
            }
        });

        res.json({
            success: true,
            message: 'Health metric added successfully',
            metric: newMetric
        });

    } catch (error) {
        console.error('Error adding health metric:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Set fitness goal
app.post('/api/member/set-goal', async (req, res) => {
    try {
        const { userId, goalType, targetValue, startDate, targetDate } = req.body;

        if (!userId || !goalType || !targetValue) {
            return res.status(400).json({ error: 'User ID, goal type, and target value are required' });
        }

        // Validate target value is a number
        const numericValue = parseFloat(targetValue);
        if (isNaN(numericValue)) {
            return res.status(400).json({ error: 'Target value must be a number' });
        }

        // Validate goal type
        const validGoalTypes = ['target_weight', 'target_body_fat', 'target_max_hr'];
        if (!validGoalTypes.includes(goalType)) {
            return res.status(400).json({ error: 'Invalid goal type' });
        }

        // Deactivate any existing active goals of the same type
        await prisma.fitnessGoal.updateMany({
            where: { 
                user_id: parseInt(userId),
                goal_type: goalType,
                is_active: true
            },
            data: { is_active: false }
        });

        // Create new goal
        const newGoal = await prisma.fitnessGoal.create({
            data: {
                user_id: parseInt(userId),
                goal_type: goalType,
                target_value: numericValue,
                start_date: startDate ? new Date(startDate) : new Date(),
                target_date: targetDate ? new Date(targetDate) : null,
                is_active: true
            }
        });

        res.json({
            success: true,
            message: 'Fitness goal set successfully',
            goal: newGoal
        });

    } catch (error) {
        console.error('Error setting fitness goal:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Get health history for a specific metric type
app.post('/api/member/health-history', async (req, res) => {
    try {
        const { userId, metricType } = req.body;

        if (!userId || !metricType) {
            return res.status(400).json({ error: 'User ID and metric type are required' });
        }

        // Validate metric type
        const validMetricTypes = ['weight', 'body_fat', 'max_hr'];
        if (!validMetricTypes.includes(metricType)) {
            return res.status(400).json({ error: 'Invalid metric type' });
        }

        // Get all health metrics for this user and metric type, ordered by date
        const history = await prisma.healthMetric.findMany({
            where: { 
                user_id: parseInt(userId),
                metric_type: metricType
            },
            orderBy: { logged_at: 'asc' }, //Interaction with Index: Allow faster sorting 
            select: {
                metric_id: true,
                current_value: true,
                logged_at: true,
                metric_type: true
            }
        });

        res.json({
            success: true,
            history: history,
            metricType: metricType
        });

    } catch (error) {
        console.error('Error fetching health history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Get all members for trainer search
app.post('/api/trainer/members', async (req, res) => {
    try {
        const { trainerId } = req.body;

        if (!trainerId) {
            return res.status(400).json({ error: 'Trainer ID is required' });
        }

        // Verify trainer exists and is actually a trainer
        const trainer = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(trainerId),
                role: 'trainer'
            }
        });

        if (!trainer) {
            return res.status(403).json({ error: 'Access denied - trainer not found' });
        }

        // Get all members (trainers can see all members)
        const members = await prisma.users.findMany({
            where: { 
                role: 'member'
            },
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true
            },
            orderBy: [
                { first_name: 'asc' },
                { last_name: 'asc' }
            ]
        });

        res.json({
            success: true,
            members: members
        });

    } catch (error) {
        console.error('Error fetching members for trainer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get detailed member information for trainer view
app.post('/api/trainer/member-details', async (req, res) => {
    try {
        const { trainerId, memberId } = req.body;

        if (!trainerId || !memberId) {
            return res.status(400).json({ error: 'Trainer ID and Member ID are required' });
        }

        // Verify trainer exists
        const trainer = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(trainerId),
                role: 'trainer'
            }
        });

        if (!trainer) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get member basic information
        const user = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(memberId),
                role: 'member'
            },
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
                phone: true,
                gender: true,
                date_of_birth: true,
                past_classes_count: true,
                upcoming_sessions_count: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Get latest health metrics for each type
        const latestMetrics = await prisma.healthMetric.findMany({
            where: { user_id: parseInt(memberId) },
            orderBy: { logged_at: 'desc' },
            distinct: ['metric_type']
        });

        // Get active fitness goal
        const activeGoal = await prisma.fitnessGoal.findFirst({
            where: { 
                user_id: parseInt(memberId),
                is_active: true 
            },
            orderBy: { created_at: 'desc' }
        });

        res.json({
            success: true,
            memberData: {
                user: user,
                latestMetrics: latestMetrics,
                activeGoal: activeGoal
            }
        });

    } catch (error) {
        console.error('Error fetching member details for trainer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get trainer availability
app.post('/api/trainer/availability', async (req, res) => {
    try {
        const { trainerId } = req.body;

        if (!trainerId) {
            return res.status(400).json({ error: 'Trainer ID is required' });
        }

        const availability = await prisma.trainerAvailability.findMany({
            where: { trainer_id: parseInt(trainerId) },
            orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }]
        });

        res.json({
            success: true,
            availability: availability
        });

    } catch (error) {
        console.error('Error fetching trainer availability:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add trainer availability
app.post('/api/trainer/add-availability', async (req, res) => {
    try {
        const { trainerId, dayOfWeek, startTime, endTime, frequency } = req.body;

        if (!trainerId || !dayOfWeek || !startTime || !endTime || !frequency) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate time format (simple validation)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            return res.status(400).json({ error: 'Invalid time format' });
        }

        // Verify trainer exists
        const trainer = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(trainerId),
                role: 'trainer'
            }
        });

        if (!trainer) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const newAvailability = await prisma.trainerAvailability.create({
            data: {
                trainer_id: parseInt(trainerId),
                day_of_week: dayOfWeek,
                start_time: startTime, 
                end_time: endTime,     
                frequency: frequency
            }
        });

        res.json({
            success: true,
            message: 'Availability added successfully',
            availability: newAvailability
        });

    } catch (error) {
        console.error('Error adding trainer availability:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Remove trainer availability
app.post('/api/trainer/remove-availability', async (req, res) => {
    try {
        const { trainerId, availabilityId } = req.body;

        if (!trainerId || !availabilityId) {
            return res.status(400).json({ error: 'Trainer ID and Availability ID are required' });
        }

        // Verify the availability belongs to the trainer
        const availability = await prisma.trainerAvailability.findFirst({
            where: {
                availability_id: parseInt(availabilityId),
                trainer_id: parseInt(trainerId)
            }
        });

        if (!availability) {
            return res.status(404).json({ error: 'Availability not found' });
        }

        await prisma.trainerAvailability.delete({
            where: { availability_id: parseInt(availabilityId) }
        });

        res.json({
            success: true,
            message: 'Availability removed successfully'
        });

    } catch (error) {
        console.error('Error removing trainer availability:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check for overlapping availability
app.post('/api/trainer/check-overlaps', async (req, res) => {
    try {
        const { trainerId, days, startTime, endTime } = req.body;

        if (!trainerId || !days || !startTime || !endTime) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        let hasOverlap = false;

        // Check each day for overlaps
        for (const day of days) {
            const existingAvailability = await prisma.trainerAvailability.findMany({
                where: {
                    trainer_id: parseInt(trainerId),
                    day_of_week: day,
                }
            });

            for (const existing of existingAvailability) {
                // Simple string comparison - no timezone issues!
                if ((startTime < existing.end_time && endTime > existing.start_time)) {
                    hasOverlap = true;
                    console.log(`Overlap found: ${startTime}-${endTime} conflicts with ${existing.start_time}-${existing.end_time} on ${day}`);
                    break;
                }
            }
            
            if (hasOverlap) break;
        }

        res.json({ hasOverlap: hasOverlap });

    } catch (error) {
        console.error('Error checking overlaps:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get admin system overview
app.post('/api/admin/overview', async (req, res) => {
    try {
        const { adminId } = req.body;

        if (!adminId) {
            return res.status(400).json({ error: 'Admin ID is required' });
        }

        // Verify admin exists
        const admin = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(adminId),
                role: 'admin'
            }
        });

        if (!admin) {
            return res.status(403).json({ error: 'Access denied - admin not found' });
        }

        // Get active members count
        const activeMembers = await prisma.users.count({
            where: { role: 'member' }
        });

        // Get equipment issues count (maintenance logs with 'Reported' or 'In Progress' status)
        const equipmentIssues = await prisma.maintenanceLog.count({
            where: {
                status: {
                    in: ['Reported', 'In Progress']
                }
            }
        });

        // Get pending bills count
        const pendingBills = await prisma.bill.count({
            where: { status: 'Pending' }
        });

        // Get active trainers count
        const activeTrainers = await prisma.users.count({
            where: { role: 'trainer' }
        });

        res.json({
            success: true,
            overview: {
                activeMembers: activeMembers,
                equipmentIssues: equipmentIssues,
                pendingBills: pendingBills,
                activeTrainers: activeTrainers
            }
        });

    } catch (error) {
        console.error('Error fetching admin overview:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all equipment
app.post('/api/admin/equipment', async (req, res) => {
    try {
        const { adminId } = req.body;

        if (!adminId) {
            return res.status(400).json({ error: 'Admin ID is required' });
        }

        // Verify admin exists
        const admin = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(adminId),
                role: 'admin'
            }
        });

        if (!admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const equipment = await prisma.equipment.findMany({
            orderBy: { name: 'asc' }
        });

        res.json({
            success: true,
            equipment: equipment
        });

    } catch (error) {
        console.error('Error fetching equipment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get maintenance logs
app.post('/api/admin/maintenance-logs', async (req, res) => {
    try {
        const { adminId } = req.body;

        if (!adminId) {
            return res.status(400).json({ error: 'Admin ID is required' });
        }

        // Verify admin exists
        const admin = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(adminId),
                role: 'admin'
            }
        });

        if (!admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const logs = await prisma.maintenanceLog.findMany({
            include: {
                equipment: {
                    select: {
                        name: true
                    }
                },
                reporter: {
                    select: {
                        first_name: true,
                        last_name: true
                    }
                }
            },
            orderBy: { reported_date: 'desc' }
        });

        res.json({
            success: true,
            logs: logs
        });

    } catch (error) {
        console.error('Error fetching maintenance logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get repair tasks
app.post('/api/admin/repair-tasks', async (req, res) => {
    try {
        const { adminId } = req.body;

        if (!adminId) {
            return res.status(400).json({ error: 'Admin ID is required' });
        }

        // Verify admin exists
        const admin = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(adminId),
                role: 'admin'
            }
        });

        if (!admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const tasks = await prisma.repairTask.findMany({
            include: {
                maintenance_log: {
                    include: {
                        equipment: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: { start_time: 'desc' }
        });

        res.json({
            success: true,
            tasks: tasks
        });

    } catch (error) {
        console.error('Error fetching repair tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Log maintenance issue
app.post('/api/admin/log-maintenance', async (req, res) => {
    try {
        const { adminId, equipmentId, issueDescription } = req.body;

        if (!adminId || !equipmentId || !issueDescription) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Verify admin exists
        const admin = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(adminId),
                role: 'admin'
            }
        });

        if (!admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Verify equipment exists
        const equipment = await prisma.equipment.findUnique({
            where: { equipment_id: parseInt(equipmentId) }
        });

        if (!equipment) {
            return res.status(404).json({ error: 'Equipment not found' });
        }

        // Create maintenance log
        const maintenanceLog = await prisma.maintenanceLog.create({
            data: {
                equipment_id: parseInt(equipmentId),
                reported_by: parseInt(adminId),
                issue_description: issueDescription,
                status: 'Reported'
            }
        });

        // Update equipment status to "Under Maintenance"
        await prisma.equipment.update({
            where: { equipment_id: parseInt(equipmentId) },
            data: { status: 'Under Maintenance' }
        });

        res.json({
            success: true,
            message: 'Maintenance issue logged successfully',
            log: maintenanceLog
        });

    } catch (error) {
        console.error('Error logging maintenance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Assign repair task
app.post('/api/admin/assign-repair', async (req, res) => {
    try {
        const { adminId, logId, technician, startTime, endTime } = req.body;

        if (!adminId || !logId || !technician || !startTime || !endTime) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Verify admin exists
        const admin = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(adminId),
                role: 'admin'
            }
        });

        if (!admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Verify maintenance log exists
        const maintenanceLog = await prisma.maintenanceLog.findUnique({
            where: { log_id: parseInt(logId) },
            include: { equipment: true }
        });

        if (!maintenanceLog) {
            return res.status(404).json({ error: 'Maintenance log not found' });
        }

        // Check if repair task already exists for this log
        const existingTask = await prisma.repairTask.findUnique({
            where: { log_id: parseInt(logId) }
        });

        if (existingTask) {
            return res.status(400).json({ error: 'Repair task already exists for this maintenance log' });
        }

        // Create repair task
        const repairTask = await prisma.repairTask.create({
            data: {
                log_id: parseInt(logId),
                assigned_to: technician,
                start_time: new Date(startTime),
                end_time: new Date(endTime),
                status: 'working'
            }
        });

        // Update maintenance log status
        await prisma.maintenanceLog.update({
            where: { log_id: parseInt(logId) },
            data: { status: 'In Progress' }
        });

        res.json({
            success: true,
            message: 'Repair task assigned successfully',
            task: repairTask
        });

    } catch (error) {
        console.error('Error assigning repair:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Complete repair task
app.post('/api/admin/complete-repair', async (req, res) => {
    try {
        const { adminId, taskId } = req.body;

        if (!adminId || !taskId) {
            return res.status(400).json({ error: 'Admin ID and Task ID are required' });
        }

        // Verify admin exists
        const admin = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(adminId),
                role: 'admin'
            }
        });

        if (!admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Verify repair task exists
        const repairTask = await prisma.repairTask.findUnique({
            where: { task_id: parseInt(taskId) },
            include: { maintenance_log: true }
        });

        if (!repairTask) {
            return res.status(404).json({ error: 'Repair task not found' });
        }

        // Update repair task status
        await prisma.repairTask.update({
            where: { task_id: parseInt(taskId) },
            data: { 
                status: 'completed',
                end_time: new Date() // Set actual completion time
            }
        });

        // Update maintenance log status
        await prisma.maintenanceLog.update({
            where: { log_id: repairTask.log_id },
            data: { status: 'Resolved' }
        });

        // Update equipment status back to Operational
        await prisma.equipment.update({
            where: { equipment_id: repairTask.maintenance_log.equipment_id },
            data: { status: 'Operational' }
        });

        res.json({
            success: true,
            message: 'Repair task completed successfully'
        });

    } catch (error) {
        console.error('Error completing repair:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all bills
app.post('/api/admin/bills', async (req, res) => {
    try {
        const { adminId } = req.body;

        if (!adminId) {
            return res.status(400).json({ error: 'Admin ID is required' });
        }

        // Verify admin exists
        const admin = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(adminId),
                role: 'admin'
            }
        });

        if (!admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const bills = await prisma.bill.findMany({
            include: {
                member: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                },
                payments: true
            },
            orderBy: { issue_date: 'desc' }
        });

        res.json({
            success: true,
            bills: bills
        });

    } catch (error) {
        console.error('Error fetching bills:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all payments
app.post('/api/admin/payments', async (req, res) => {
    try {
        const { adminId } = req.body;

        if (!adminId) {
            return res.status(400).json({ error: 'Admin ID is required' });
        }

        // Verify admin exists
        const admin = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(adminId),
                role: 'admin'
            }
        });

        if (!admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const payments = await prisma.payment.findMany({
            include: {
                bill: {
                    include: {
                        member: {
                            select: {
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                }
            },
            orderBy: { payment_date: 'desc' }
        });

        res.json({
            success: true,
            payments: payments
        });

    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get members for billing
app.post('/api/admin/members-for-billing', async (req, res) => {
    try {
        const { adminId } = req.body;

        if (!adminId) {
            return res.status(400).json({ error: 'Admin ID is required' });
        }

        // Verify admin exists
        const admin = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(adminId),
                role: 'admin'
            }
        });

        if (!admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const members = await prisma.users.findMany({
            where: { role: 'member' },
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true
            },
            orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }]
        });

        res.json({
            success: true,
            members: members
        });

    } catch (error) {
        console.error('Error fetching members for billing:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate new bill
app.post('/api/admin/generate-bill', async (req, res) => {
    try {
        const { adminId, memberId, description, amount, dueDate } = req.body;

        if (!adminId || !memberId || !description || !amount || !dueDate) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Verify admin exists
        const admin = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(adminId),
                role: 'admin'
            }
        });

        if (!admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Verify member exists
        const member = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(memberId),
                role: 'member'
            }
        });

        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Create bill
        const bill = await prisma.bill.create({
            data: {
                member_id: parseInt(memberId),
                amount_due: parseFloat(amount),
                issue_date: new Date(),
                due_date: new Date(dueDate),
                description: description,
                status: 'Pending'
            }
        });

        res.json({
            success: true,
            message: 'Bill generated successfully',
            bill: bill
        });

    } catch (error) {
        console.error('Error generating bill:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get bill details with remaining amount
app.post('/api/admin/bill-details', async (req, res) => {
    try {
        const { adminId, billId } = req.body;

        if (!adminId || !billId) {
            return res.status(400).json({ error: 'Admin ID and Bill ID are required' });
        }

        // Verify admin exists
        const admin = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(adminId),
                role: 'admin'
            }
        });

        if (!admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get bill with payments
        const bill = await prisma.bill.findUnique({
            where: { bill_id: parseInt(billId) },
            include: { payments: true }
        });

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        // Calculate total paid and remaining amount
        const totalPaid = bill.payments.reduce((total, payment) => {
            return total + parseFloat(payment.amount_paid);
        }, 0);

        const remainingAmount = parseFloat(bill.amount_due) - totalPaid;

        res.json({
            success: true,
            bill: {
                ...bill,
                total_paid: totalPaid,
                remaining_amount: remainingAmount
            }
        });

    } catch (error) {
        console.error('Error fetching bill details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Record payment
// Record payment
app.post('/api/admin/record-payment', async (req, res) => {
    try {
        const { adminId, billId, amount, paymentMethod, paymentDate } = req.body;

        if (!adminId || !billId || !amount || !paymentMethod || !paymentDate) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Verify admin exists
        const admin = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(adminId),
                role: 'admin'
            }
        });

        if (!admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Verify bill exists and get current payment status
        const bill = await prisma.bill.findUnique({
            where: { bill_id: parseInt(billId) },
            include: { payments: true }
        });

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        // Calculate current total paid and remaining amount
        const currentTotalPaid = bill.payments.reduce((total, payment) => {
            return total + parseFloat(payment.amount_paid);
        }, 0);

        const billAmountDue = parseFloat(bill.amount_due);
        const remainingAmount = billAmountDue - currentTotalPaid;
        const paymentAmount = parseFloat(amount);

        // Validate payment amount doesn't exceed remaining amount
        if (paymentAmount > remainingAmount) {
            return res.status(400).json({ error: `Payment amount cannot exceed remaining balance of $${remainingAmount.toFixed(2)}` });
        }

        // Validate payment amount is positive
        if (paymentAmount <= 0) {
            return res.status(400).json({ error: 'Payment amount must be greater than 0' });
        }

        // Create payment record
        const payment = await prisma.payment.create({
            data: {
                bill_id: parseInt(billId),
                amount_paid: paymentAmount,
                payment_date: new Date(paymentDate),
                payment_method: paymentMethod
            }
        });

        // Calculate new total paid after this payment
        const newTotalPaid = currentTotalPaid + paymentAmount;

        // Update bill status based on new total paid
        let newBillStatus;
        if (newTotalPaid >= billAmountDue) {
            newBillStatus = 'Paid';
        } else if (newTotalPaid > 0) {
            newBillStatus = 'Partially Paid';
        } else {
            newBillStatus = 'Pending';
        }

        await prisma.bill.update({
            where: { bill_id: parseInt(billId) },
            data: { status: newBillStatus }
        });

        res.json({
            success: true,
            message: 'Payment recorded successfully',
            payment: payment,
            billStatus: newBillStatus,
            remainingAmount: billAmountDue - newTotalPaid
        });

    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get financial reports
app.post('/api/admin/financial-reports', async (req, res) => {
    try {
        const { adminId } = req.body;

        if (!adminId) {
            return res.status(400).json({ error: 'Admin ID is required' });
        }

        // Verify admin exists
        const admin = await prisma.users.findUnique({
            where: { 
                user_id: parseInt(adminId),
                role: 'admin'
            }
        });

        if (!admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Calculate monthly revenue (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const monthlyPayments = await prisma.payment.aggregate({
            where: {
                payment_date: {
                    gte: thirtyDaysAgo
                }
            },
            _sum: {
                amount_paid: true
            }
        });

        const monthlyRevenue = monthlyPayments._sum.amount_paid || 0;

        // Calculate total pending bills
        const pendingBills = await prisma.bill.aggregate({
            where: {
                status: 'Pending'
            },
            _sum: {
                amount_due: true
            }
        });

        const totalPending = pendingBills._sum.amount_due || 0;

        // Get total members count
        const totalMembers = await prisma.users.count({
            where: { role: 'member' }
        });

        // Calculate collection rate (paid bills vs total bills)
        const totalBills = await prisma.bill.aggregate({
            _sum: {
                amount_due: true
            }
        });

        const totalPaid = await prisma.payment.aggregate({
            _sum: {
                amount_paid: true
            }
        });

        const totalBillsAmount = totalBills._sum.amount_due || 1; // Avoid division by zero
        const totalPaidAmount = totalPaid._sum.amount_paid || 0;
        const collectionRate = (totalPaidAmount / totalBillsAmount) * 100;

        res.json({
            success: true,
            reports: {
                monthlyRevenue: monthlyRevenue,
                totalPending: totalPending,
                totalMembers: totalMembers,
                collectionRate: collectionRate
            }
        });

    } catch (error) {
        console.error('Error generating financial reports:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Serve HTML files

// Serve starting page
app.get('/registration.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/html/registration.html'));
});

// Route to serve login page
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/html/login.html'));
});

app.get('/member-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/html/member-dashboard.html'));
});

app.get('/profile-management.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/html/profile-management.html'));
});

app.get('/health-history.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/html/health-history.html'));
});

app.get('/trainer-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/html/trainer-dashboard.html'));
});

app.get('/admin-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/html/admin-dashboard.html'));
});

app.get('/equipment-maintenance.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/html/equipment-maintenance.html'));
});

app.get('/billing-payment.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/html/billing-payment.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/login.html`);
});