// Unit tests for adminController.js
const adminController = require('../../../src/controllers/adminController');
const prisma = require('../../../src/config/db');

jest.mock('../../../src/config/db');

describe('AdminController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { user_id: 1 },
            body: {},
            ip: '127.0.0.1'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe('validateToken', () => {
        it('should validate admin token and return user data', async () => {
            const mockUser = {
                userId: 1,
                username: 'admin',
                role: 'admin',
                citizenId: 'CIT001',
                citizen: {
                    fullName: 'Admin User',
                    email: 'admin@voteguard.com',
                    constituency: 'District-1'
                }
            };

            prisma.user.findUnique.mockResolvedValue(mockUser);

            await adminController.validateToken(req, res);

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { userId: 1 },
                select: expect.any(Object)
            });
            expect(res.json).toHaveBeenCalledWith({
                valid: true,
                user: {
                    user_id: 1,
                    email: 'admin@voteguard.com',
                    role: 'admin',
                    full_name: 'Admin User',
                    constituency: 'District-1',
                    username: 'admin'
                },
                message: "Token is valid"
            });
        });

        it('should return 404 when user not found', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await adminController.validateToken(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "User not found"
            });
        });

        it('should handle database errors', async () => {
            prisma.user.findUnique.mockRejectedValue(new Error('DB Error'));

            await adminController.validateToken(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Token validation error"
            });
        });
    });

    describe('getSystemStats', () => {
        it('should return system statistics', async () => {
            prisma.user.count.mockResolvedValue(150);
            prisma.vote.count.mockResolvedValue(120);
            prisma.election.findFirst.mockResolvedValue({
                id: 1,
                title: 'General Election 2026'
            });

            await adminController.getSystemStats(req, res);

            expect(prisma.user.count).toHaveBeenCalledWith({
                where: { role: 'voter' }
            });
            expect(prisma.vote.count).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                totalVoters: 150,
                totalVotes: 120,
                activeElection: 'General Election 2026',
                status: "System Operational"
            });
        });

        it('should handle no active election', async () => {
            prisma.user.count.mockResolvedValue(100);
            prisma.vote.count.mockResolvedValue(80);
            prisma.election.findFirst.mockResolvedValue(null);

            await adminController.getSystemStats(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    activeElection: "No Live Election"
                })
            );
        });

        it('should handle errors', async () => {
            prisma.user.count.mockRejectedValue(new Error('Stats error'));

            await adminController.getSystemStats(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Stats Error"
            });
        });
    });

    describe('createElection', () => {
        it('should create new election successfully', async () => {
            const newElection = {
                id: 1,
                title: 'New Election',
                description: 'Description',
                constituency: 'District-1',
                startTime: new Date(),
                endTime: new Date(),
                status: 'LIVE'
            };

            req.body = {
                title: 'New Election',
                description: 'Description',
                constituency: 'District-1',
                startTime: '2026-03-01T00:00:00Z',
                endTime: '2026-03-01T23:59:59Z'
            };

            prisma.election.create.mockResolvedValue(newElection);
            prisma.auditLog.create.mockResolvedValue({});

            await adminController.createElection(req, res);

            expect(prisma.election.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    title: 'New Election',
                    description: 'Description',
                    constituency: 'District-1',
                    status: 'LIVE'
                })
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: "Election Created",
                electionId: 1
            });
        });
