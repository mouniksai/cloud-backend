// Add test election and candidates to Sepolia blockchain
const blockchainService = require('../src/blockchain/blockchainServiceV2');

async function addTestData() {
    try {
        console.log('🔗 Initializing blockchain connection...');
        await blockchainService.initialize();

        console.log('\n📝 Adding test election...');
        const election = await blockchainService.addElection({
            id: 'e-2025-gen',
            title: '2025 National General Election',
            description: 'Member of Parliament Election',
            constituency: 'Mumbai South',
            startTime: new Date('2025-01-05T00:00:00Z'),
            endTime: new Date('2026-12-31T23:59:59Z') // Far future for testing
        });

        console.log('✅ Election added:', election.election.title);

        console.log('\n👥 Adding candidates...');

        const candidates = [
            {
                id: 'cand-1',
                name: 'Dr. Rajesh Kumar',
                party: 'Progressive Alliance Party',
                symbol: '🌳',
                age: 52,
                education: 'PhD in Economics, IIT Delhi',
                experience: '15 years in public service',
                electionId: 'e-2025-gen'
            },
            {
                id: 'cand-2',
                name: 'Anita Deshmukh',
                party: 'Unity Front Coalition',
                symbol: '🌅',
                age: 48,
                education: 'MBA, Harvard Business School',
                experience: 'Former State Minister, 10 years',
                electionId: 'e-2025-gen'
            },
            {
                id: 'cand-3',
                name: 'Mohammed Akhtar',
                party: "People's Democratic Coalition",
                symbol: '⭐',
                age: 45,
                education: 'LLB, National Law School',
                experience: 'Civil Rights Lawyer, 20 years',
                electionId: 'e-2025-gen'
            },
            {
                id: 'cand-4',
                name: 'Priya Menon',
                party: 'Progressive Democratic Movement',
                symbol: '🦅',
                age: 41,
                education: 'B.Tech IIT Bombay, MS Stanford',
                experience: 'Tech Entrepreneur, 12 years',
                electionId: 'e-2025-gen'
            }
        ];

        for (const candidateData of candidates) {
            const candidate = await blockchainService.addCandidate(candidateData);
            console.log(`✅ Added: ${candidate.candidate.name}`);
        }

        console.log('\n🎉 Test data added successfully!');
        console.log('📍 Election ID:', election.election.id);
        console.log('🗳️  Candidates:', candidates.length);

        console.log('\n✅ Frontend should now load data from blockchain!');
        console.log('🌐 Visit: http://localhost:3000/vote');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error adding test data:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

addTestData();
