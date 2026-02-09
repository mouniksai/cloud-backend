// Unit tests for roleMiddleware.js
const roleMiddleware = require('../../../src/middleware/roleMiddleware');

describe('RoleMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: null
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();

        // Suppress console.warn for tests
        jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        console.warn.mockRestore();
    });

    describe('Admin role validation', () => {
        it('should allow access when user has admin role', () => {
            req.user = { user_id: 1, role: 'admin' };

            const middleware = roleMiddleware('admin');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        it('should deny access when user role is voter', () => {
            req.user = { user_id: 2, role: 'voter' };

            const middleware = roleMiddleware('admin');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: "Access Forbidden: Insufficient Permissions"
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should log security warning on unauthorized access', () => {
            req.user = { user_id: 5, role: 'voter' };

            const middleware = roleMiddleware('admin');
            middleware(req, res, next);

            expect(console.warn).toHaveBeenCalledWith(
                '[SECURITY] Unauthorized Access Attempt by User: 5'
            );
        });
    });

    describe('Voter role validation', () => {
        it('should allow access when user has voter role', () => {
            req.user = { user_id: 10, role: 'voter' };

            const middleware = roleMiddleware('voter');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should deny access when user is not voter', () => {
            req.user = { user_id: 1, role: 'admin' };

            const middleware = roleMiddleware('voter');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Missing user scenarios', () => {
        it('should deny access when req.user is null', () => {
            req.user = null;

            const middleware = roleMiddleware('admin');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: "Access Forbidden: Insufficient Permissions"
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should deny access when req.user is undefined', () => {
            req.user = undefined;

            const middleware = roleMiddleware('admin');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        it('should log warning with undefined user_id', () => {
            req.user = null;

            const middleware = roleMiddleware('admin');
            middleware(req, res, next);

            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('undefined')
            );
        });
    });

    