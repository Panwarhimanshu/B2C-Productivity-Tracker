require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Department = require('../src/models/Department');
const FormTemplate = require('../src/models/FormTemplate');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/b2c_task_tracker');
  console.log('Connected to MongoDB');

  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    FormTemplate.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  const departments = await Department.insertMany([
    { name: 'North', description: 'Northern region' },
    { name: 'South', description: 'Southern region' },
    { name: 'East', description: 'Eastern region' },
    { name: 'West', description: 'Western region' },
  ]);
  console.log('Departments seeded:', departments.map((d) => d.name).join(', '));

  const superAdmin = await User.create({
    name: 'Rajesh Kumar',
    email: 'superadmin@company.com',
    password: 'Admin@123',
    role: 'SUPER_ADMIN',
    employeeId: 'SA001',
    departmentId: departments[0]._id,
    joiningDate: new Date('2020-01-15'),
  });

  const hod1 = await User.create({
    name: 'Priya Sharma',
    email: 'hod1@company.com',
    password: 'Admin@123',
    role: 'HOD',
    employeeId: 'HOD001',
    departmentId: departments[0]._id,
    joiningDate: new Date('2021-03-10'),
  });

  const hod2 = await User.create({
    name: 'Amit Singh',
    email: 'hod2@company.com',
    password: 'Admin@123',
    role: 'HOD',
    employeeId: 'HOD002',
    departmentId: departments[1]._id,
    joiningDate: new Date('2021-06-20'),
  });

  // Use User.create (not insertMany) so the pre('save') hook hashes each password.
  const counsellorData = [
    { name: 'Anita Verma', email: 'counsellor1@company.com', password: 'User@123', role: 'COUNSELLOR', employeeId: 'C001', departmentId: departments[0]._id, joiningDate: new Date('2022-01-10') },
    { name: 'Rohit Gupta', email: 'counsellor2@company.com', password: 'User@123', role: 'COUNSELLOR', employeeId: 'C002', departmentId: departments[0]._id, joiningDate: new Date('2022-03-15') },
    { name: 'Sunita Patel', email: 'counsellor3@company.com', password: 'User@123', role: 'COUNSELLOR', employeeId: 'C003', departmentId: departments[1]._id, joiningDate: new Date('2022-05-20') },
    { name: 'Vikram Rao', email: 'counsellor4@company.com', password: 'User@123', role: 'COUNSELLOR', employeeId: 'C004', departmentId: departments[1]._id, joiningDate: new Date('2022-07-01') },
  ];
  const counsellors = [];
  for (const data of counsellorData) {
    counsellors.push(await User.create(data));
  }
  console.log('Users seeded');

  await FormTemplate.create({
    name: 'Default Daily Report',
    createdBy: superAdmin._id,
    fields: [
      { fieldKey: 'calls_made', fieldLabel: 'Calls Made', fieldType: 'number', required: true, order: 1, placeholder: 'Enter number of calls' },
      { fieldKey: 'meetings_attended', fieldLabel: 'Meetings Attended', fieldType: 'number', required: true, order: 2 },
      { fieldKey: 'proposals_sent', fieldLabel: 'Proposals Sent', fieldType: 'number', required: false, order: 3 },
      { fieldKey: 'deals_closed', fieldLabel: 'Deals Closed', fieldType: 'number', required: false, order: 4 },
      { fieldKey: 'client_visits', fieldLabel: 'Client Visits', fieldType: 'number', required: false, order: 5 },
      { fieldKey: 'lead_status', fieldLabel: 'Lead Status Update', fieldType: 'dropdown', required: false, options: ['Hot', 'Warm', 'Cold', 'Converted', 'Lost'], order: 6 },
      { fieldKey: 'daily_remarks', fieldLabel: 'Daily Remarks', fieldType: 'textarea', required: false, order: 7, placeholder: 'Any additional notes...' },
    ],
  });
  console.log('Form template seeded');

  console.log('\n=== Seed Complete ===');
  console.log('Demo credentials:');
  console.log('Super Admin: superadmin@company.com  / Admin@123');
  console.log('HOD:         hod1@company.com        / Admin@123');
  console.log('HOD:         hod2@company.com         / Admin@123');
  console.log('Counsellor:  counsellor1@company.com  / User@123');
  console.log('Counsellor:  counsellor2@company.com  / User@123');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
