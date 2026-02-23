// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VoteGuardBlockchain
 * @dev Professional blockchain storage for VoteGuard voting system
 * @notice This contract replaces JSON-based storage with immutable on-chain records
 * 
 * Gas Optimization Techniques Used:
 * - Tight packing of structs (saves storage slots)
 * - uint32 for timestamps (sufficient until year 2106)
 * - bytes32 for IDs (more efficient than strings)
 * - Events for data retrieval (cheaper than storage reads)
 * - Mapping-based indexing for O(1) lookups
 */
contract VoteGuardBlockchain {
    
    // ============================================================
    // ENUMS & STRUCTS
    // ============================================================
    
    enum ElectionStatus { UPCOMING, LIVE, ENDED, CANCELLED }
    enum TransactionType { GENESIS, ELECTION, CANDIDATE, VOTE, AUDIT, STATUS_UPDATE }
    
    struct Block {
        uint256 index;
        uint32 timestamp;
        bytes32 previousHash;
        bytes32 merkleRoot;
        uint64 nonce;
        bytes32 blockHash;
        uint16 transactionCount;
    }
    
    struct Election {
        bytes32 id;
        string title;
        string description;
        string constituency;
        uint32 startTime;
        uint32 endTime;
        ElectionStatus status;
        uint32 createdAt;
        bool exists;
    }
    
    struct Candidate {
        bytes32 id;
        string name;
        string party;
        string symbol;
        uint8 age;
        string education;
        string experience;
        bytes32 electionId;
        uint32 createdAt;
        bool exists;
    }
    
    struct Vote {
        bytes32 id;
        bytes32 userId;
        bytes32 electionId;
        bytes32 candidateId;
        bytes32 receiptHash;
        string encryptedVote;
        uint32 timestamp;
        uint256 blockIndex;
    }
    
    struct AuditLog {
        bytes32 id;
        bytes32 userId;
        string action;
        string details;
        string ipAddress;
        uint32 timestamp;
        uint256 blockIndex;
    }

    // ============================================================
    // STATE VARIABLES
    // ============================================================
    
    address public owner;
    uint256 public chainLength;
    uint256 public totalTransactions;
    uint8 public constant DIFFICULTY = 4;
    
    // Storage mappings (optimized for gas)
    mapping(uint256 => Block) public blocks;
    mapping(bytes32 => Election) public elections;
    mapping(bytes32 => Candidate) public candidates;
    mapping(bytes32 => Vote) public votes;
    mapping(bytes32 => AuditLog) public auditLogs;
    
    // Indexing for efficient queries
    mapping(bytes32 => bytes32[]) public electionCandidates; // electionId => candidateIds[]
    mapping(bytes32 => bytes32[]) public userVotes; // userId => voteIds[]
    mapping(bytes32 => bytes32[]) public electionVotes; // electionId => voteIds[]
    mapping(bytes32 => uint256) public candidateVoteCount; // candidateId => count
    
    // Arrays for iteration (use events instead when possible)
    bytes32[] public electionIds;
    bytes32[] public candidateIds;
    bytes32[] public voteIds;
    bytes32[] public auditLogIds;

    // ============================================================
    // EVENTS (Gas-efficient data retrieval)
    // ============================================================
    
    event BlockMined(
        uint256 indexed blockIndex,
        bytes32 indexed blockHash,
        uint32 timestamp,
        uint16 transactionCount
    );
    
    event ElectionCreated(
        bytes32 indexed electionId,
        string title,
        string constituency,
        uint32 startTime,
        uint32 endTime,
        uint256 blockIndex
    );
    
    event ElectionStatusUpdated(
        bytes32 indexed electionId,
        ElectionStatus newStatus,
        uint32 timestamp
    );
    
    event CandidateAdded(
        bytes32 indexed candidateId,
        bytes32 indexed electionId,
        string name,
        string party,
        uint256 blockIndex
    );
    
    event VoteCast(
        bytes32 indexed voteId,
        bytes32 indexed userId,
        bytes32 indexed electionId,
        bytes32 candidateId,
        bytes32 receiptHash,
        uint256 blockIndex
    );
    
    event AuditLogRecorded(
        bytes32 indexed auditId,
        bytes32 indexed userId,
        string action,
        uint256 blockIndex
    );

    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can execute this");
        _;
    }
    
    modifier validElectionTime(uint32 startTime, uint32 endTime) {
        require(startTime > block.timestamp, "Start time must be in future");
        require(endTime > startTime, "End time must be after start time");
        _;
    }

    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        _createGenesisBlock();
    }

    // ============================================================
    // WRITE FUNCTIONS (Replace JSON Write Operations)
    // ============================================================
    
    /**
     * @dev Creates the genesis block (called once in constructor)
     */
    function _createGenesisBlock() private {
        bytes32 genesisHash = keccak256(
            abi.encodePacked(
                uint256(0),
                bytes32(0),
                uint32(block.timestamp),
                "GENESIS"
            )
        );
        
        blocks[0] = Block({
            index: 0,
            timestamp: uint32(block.timestamp),
            previousHash: bytes32(0),
            merkleRoot: genesisHash,
            nonce: 0,
            blockHash: genesisHash,
            transactionCount: 1
        });
        
        chainLength = 1;
        totalTransactions = 1;
        
        emit BlockMined(0, genesisHash, uint32(block.timestamp), 1);
    }
    
    /**
     * @dev Add a new election to the blockchain
     * @param id Unique election identifier (bytes32 for gas efficiency)
     * @param title Election title
     * @param description Election description
     * @param constituency Geographic area
     * @param startTime Unix timestamp for election start
     * @param endTime Unix timestamp for election end
     */
    function addElection(
        bytes32 id,
        string memory title,
        string memory description,
        string memory constituency,
        uint32 startTime,
        uint32 endTime
    ) external onlyOwner validElectionTime(startTime, endTime) {
        require(!elections[id].exists, "Election already exists");
        
        elections[id] = Election({
            id: id,
            title: title,
            description: description,
            constituency: constituency,
            startTime: startTime,
            endTime: endTime,
            status: ElectionStatus.UPCOMING,
            createdAt: uint32(block.timestamp),
            exists: true
        });
        
        electionIds.push(id);
        
        // Mine a new block for this transaction
        _mineBlock(1);
        
        emit ElectionCreated(id, title, constituency, startTime, endTime, chainLength - 1);
    }
    
    /**
     * @dev Update election status
     * @param electionId The election to update
     * @param newStatus New status (LIVE, ENDED, CANCELLED)
     */
    function updateElectionStatus(
        bytes32 electionId,
        ElectionStatus newStatus
    ) external onlyOwner {
        require(elections[electionId].exists, "Election does not exist");
        
        elections[electionId].status = newStatus;
        
        _mineBlock(1);
        
        emit ElectionStatusUpdated(electionId, newStatus, uint32(block.timestamp));
    }
    
    /**
     * @dev Add a candidate to an election
     * @param id Unique candidate identifier
     * @param name Candidate's name
     * @param party Political party
     * @param symbol Party symbol
     * @param age Candidate's age
     * @param education Educational background
     * @param experience Professional experience
     * @param electionId Election this candidate is running in
     */
    function addCandidate(
        bytes32 id,
        string memory name,
        string memory party,
        string memory symbol,
        uint8 age,
        string memory education,
        string memory experience,
        bytes32 electionId
    ) external onlyOwner {
        require(!candidates[id].exists, "Candidate already exists");
        require(elections[electionId].exists, "Election does not exist");
        require(age >= 18 && age <= 120, "Invalid age");
        
        candidates[id] = Candidate({
            id: id,
            name: name,
            party: party,
            symbol: symbol,
            age: age,
            education: education,
            experience: experience,
            electionId: electionId,
            createdAt: uint32(block.timestamp),
            exists: true
        });
        
        candidateIds.push(id);
        electionCandidates[electionId].push(id);
        
        _mineBlock(1);
        
        emit CandidateAdded(id, electionId, name, party, chainLength - 1);
    }
    
    /**
     * @dev Record a vote on the blockchain (IMMUTABLE)
     * @param id Unique vote identifier
     * @param userId Voter's identifier
     * @param electionId Election being voted in
     * @param candidateId Chosen candidate
     * @param receiptHash Hash for vote verification
     * @param encryptedVote Encrypted vote data
     */
    function castVote(
        bytes32 id,
        bytes32 userId,
        bytes32 electionId,
        bytes32 candidateId,
        bytes32 receiptHash,
        string memory encryptedVote
    ) external {
        require(elections[electionId].exists, "Election does not exist");
        require(candidates[candidateId].exists, "Candidate does not exist");
        require(elections[electionId].status == ElectionStatus.LIVE, "Election not live");
        require(votes[id].timestamp == 0, "Vote already exists");
        
        // Check if user already voted in this election
        bytes32[] memory userVoteList = userVotes[userId];
        for (uint i = 0; i < userVoteList.length; i++) {
            require(votes[userVoteList[i]].electionId != electionId, "Already voted");
        }
        
        votes[id] = Vote({
            id: id,
            userId: userId,
            electionId: electionId,
            candidateId: candidateId,
            receiptHash: receiptHash,
            encryptedVote: encryptedVote,
            timestamp: uint32(block.timestamp),
            blockIndex: chainLength
        });
        
        voteIds.push(id);
        userVotes[userId].push(id);
        electionVotes[electionId].push(id);
        candidateVoteCount[candidateId]++;
        
        _mineBlock(1);
        
        emit VoteCast(id, userId, electionId, candidateId, receiptHash, chainLength - 1);
    }
    
    /**
     * @dev Record an audit log entry
     * @param id Unique audit log identifier
     * @param userId User performing the action
     * @param action Action performed
     * @param details Additional details
     * @param ipAddress User's IP address
     */
    function recordAuditLog(
        bytes32 id,
        bytes32 userId,
        string memory action,
        string memory details,
        string memory ipAddress
    ) external {
        auditLogs[id] = AuditLog({
            id: id,
            userId: userId,
            action: action,
            details: details,
            ipAddress: ipAddress,
            timestamp: uint32(block.timestamp),
            blockIndex: chainLength
        });
        
        auditLogIds.push(id);
        
        _mineBlock(1);
        
        emit AuditLogRecorded(id, userId, action, chainLength - 1);
    }

    // ============================================================
    // READ FUNCTIONS (Replace JSON Read Operations)
    // ============================================================
    
    /**
     * @dev Get election details by ID
     * @param electionId The election to retrieve
     * @return Election struct
     */
    function getElection(bytes32 electionId) 
        external 
        view 
        returns (Election memory) 
    {
        require(elections[electionId].exists, "Election does not exist");
        return elections[electionId];
    }
    
    /**
     * @dev Get all election IDs (paginated to avoid gas issues)
     * @param offset Starting index
     * @param limit Max number of results
     * @return Array of election IDs
     */
    function getElectionIds(uint256 offset, uint256 limit) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        require(offset < electionIds.length, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > electionIds.length) {
            end = electionIds.length;
        }
        
        bytes32[] memory result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = electionIds[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get total number of elections
     */
    function getElectionCount() external view returns (uint256) {
        return electionIds.length;
    }
    
    /**
     * @dev Get all candidates for an election
     * @param electionId The election
     * @return Array of candidate IDs
     */
    function getCandidatesByElection(bytes32 electionId) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return electionCandidates[electionId];
    }
    
    /**
     * @dev Get candidate details
     * @param candidateId The candidate to retrieve
     * @return Candidate struct
     */
    function getCandidate(bytes32 candidateId) 
        external 
        view 
        returns (Candidate memory) 
    {
        require(candidates[candidateId].exists, "Candidate does not exist");
        return candidates[candidateId];
    }
    
    /**
     * @dev Get vote count for a candidate
     * @param candidateId The candidate
     * @return Number of votes
     */
    function getCandidateVoteCount(bytes32 candidateId) 
        external 
        view 
        returns (uint256) 
    {
        return candidateVoteCount[candidateId];
    }
    
    /**
     * @dev Get all votes for an election
     * @param electionId The election
     * @return Array of vote IDs
     */
    function getVotesByElection(bytes32 electionId) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return electionVotes[electionId];
    }
    
    /**
     * @dev Get all votes by a user
     * @param userId The user
     * @return Array of vote IDs
     */
    function getVotesByUser(bytes32 userId) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return userVotes[userId];
    }
    
    /**
     * @dev Get vote details
     * @param voteId The vote to retrieve
     * @return Vote struct
     */
    function getVote(bytes32 voteId) 
        external 
        view 
        returns (Vote memory) 
    {
        require(votes[voteId].timestamp > 0, "Vote does not exist");
        return votes[voteId];
    }
    
    /**
     * @dev Verify a vote using receipt hash
     * @param receiptHash The receipt to verify
     * @return Vote struct if found
     */
    function verifyVoteByReceipt(bytes32 receiptHash) 
        external 
        view 
        returns (Vote memory) 
    {
        // Linear search (consider adding a mapping for production)
        for (uint i = 0; i < voteIds.length; i++) {
            if (votes[voteIds[i]].receiptHash == receiptHash) {
                return votes[voteIds[i]];
            }
        }
        revert("Vote not found");
    }
    
    /**
     * @dev Get block details
     * @param blockIndex The block index
     * @return Block struct
     */
    function getBlock(uint256 blockIndex) 
        external 
        view 
        returns (Block memory) 
    {
        require(blockIndex < chainLength, "Block does not exist");
        return blocks[blockIndex];
    }
    
    /**
     * @dev Get blockchain statistics
     * @return chainLength, totalTransactions, difficulty
     */
    function getChainStats() 
        external 
        view 
        returns (uint256, uint256, uint8) 
    {
        return (chainLength, totalTransactions, DIFFICULTY);
    }
    
    /**
     * @dev Get audit log details
     * @param auditId The audit log to retrieve
     * @return AuditLog struct
     */
    function getAuditLog(bytes32 auditId) 
        external 
        view 
        returns (AuditLog memory) 
    {
        require(auditLogs[auditId].timestamp > 0, "Audit log does not exist");
        return auditLogs[auditId];
    }

    // ============================================================
    // INTERNAL FUNCTIONS
    // ============================================================
    
    /**
     * @dev Mine a new block (simplified PoW simulation)
     * @param txCount Number of transactions in this block
     */
    function _mineBlock(uint16 txCount) private {
        Block memory previousBlock = blocks[chainLength - 1];
        
        bytes32 newHash = keccak256(
            abi.encodePacked(
                chainLength,
                previousBlock.blockHash,
                uint32(block.timestamp),
                txCount,
                block.difficulty
            )
        );
        
        blocks[chainLength] = Block({
            index: chainLength,
            timestamp: uint32(block.timestamp),
            previousHash: previousBlock.blockHash,
            merkleRoot: newHash, // Simplified (real implementation would compute from transactions)
            nonce: uint64(block.number), // Use block number as nonce
            blockHash: newHash,
            transactionCount: txCount
        });
        
        emit BlockMined(chainLength, newHash, uint32(block.timestamp), txCount);
        
        chainLength++;
        totalTransactions += txCount;
    }
    
    /**
     * @dev Transfer ownership (use carefully)
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
