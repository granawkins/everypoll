import {
  initializeTestDatabase,
  getRepositories,
  closeAllConnections,
  DbConnectionType,
} from '../../../../database';
import { AlreadyVotedError } from '../../../../errors';

describe('Vote Repository Integration', () => {
  // Use a single in-memory database for all tests in this file
  let db: any;

  // Set up the test database before all tests
  beforeAll(() => {
    db = initializeTestDatabase(DbConnectionType.TestInMemory);
  });

  // Close connections after all tests
  afterAll(() => {
    closeAllConnections();
  });

  it('should record votes and count them', () => {
    const { userRepository, pollRepository, voteRepository } = getRepositories({
      connectionType: DbConnectionType.TestInMemory,
    });

    // Create users
    const user1 = userRepository.create('user1@example.com', 'User 1');
    const user2 = userRepository.create('user2@example.com', 'User 2');
    const user3 = userRepository.create('user3@example.com', 'User 3');

    // Create a poll
    const { poll, answers } = pollRepository.create(
      user1.id,
      'What is your favorite color?',
      ['Red', 'Blue', 'Green']
    );

    // Record votes
    const vote1 = voteRepository.create(user1.id, poll.id, answers[0].id);
    // Record other votes without storing the references
    voteRepository.create(user2.id, poll.id, answers[1].id);
    voteRepository.create(user3.id, poll.id, answers[0].id);

    // Check votes
    expect(vote1.poll_id).toBe(poll.id);
    expect(vote1.answer_id).toBe(answers[0].id);
    expect(vote1.user_id).toBe(user1.id);

    // Count votes by answer
    const voteCounts = voteRepository.countVotesByAnswer(poll.id);
    expect(voteCounts[answers[0].id]).toBe(2); // Red
    expect(voteCounts[answers[1].id]).toBe(1); // Blue
    expect(voteCounts[answers[2].id]).toBeUndefined(); // Green (no votes)

    // Check total votes
    const totalVotes = voteRepository.countTotalVotes(poll.id);
    expect(totalVotes).toBe(3);
  });

  it('should prevent double voting', () => {
    const { userRepository, pollRepository, voteRepository } = getRepositories({
      connectionType: DbConnectionType.TestInMemory,
    });

    // Create a user
    const user = userRepository.create(
      'test-double@example.com',
      'Test Double Voter'
    );

    // Create a poll
    const { poll, answers } = pollRepository.create(user.id, 'Question?', [
      'Option 1',
      'Option 2',
    ]);

    // First vote should succeed
    voteRepository.create(user.id, poll.id, answers[0].id);

    // Second vote should fail with AlreadyVotedError
    expect(() => {
      voteRepository.create(user.id, poll.id, answers[1].id);
    }).toThrow(AlreadyVotedError);

    // Check if user has voted
    expect(voteRepository.hasVoted(user.id, poll.id)).toBe(true);
  });

  it('should support cross-referencing polls', () => {
    const { userRepository, pollRepository, voteRepository } = getRepositories({
      connectionType: DbConnectionType.TestInMemory,
    });

    // Create users
    const users = Array.from({ length: 10 }, (_, i) => {
      return userRepository.create(
        `cross-ref-${i}@example.com`,
        `Cross Ref User ${i}`
      );
    });

    // Create two polls
    const { poll: poll1, answers: answers1 } = pollRepository.create(
      users[0].id,
      'Favorite color?',
      ['Red', 'Blue']
    );

    const { poll: poll2, answers: answers2 } = pollRepository.create(
      users[0].id,
      'Favorite food?',
      ['Pizza', 'Pasta', 'Salad']
    );

    // Record votes for poll1
    // 6 votes for Red, 4 votes for Blue
    for (let i = 0; i < 6; i++) {
      voteRepository.create(users[i].id, poll1.id, answers1[0].id); // Red
    }
    for (let i = 6; i < 10; i++) {
      voteRepository.create(users[i].id, poll1.id, answers1[1].id); // Blue
    }

    // Record votes for poll2
    // Users 0-2: Pizza, Users 3-5: Pasta, Users 6-9: Salad
    for (let i = 0; i < 3; i++) {
      voteRepository.create(users[i].id, poll2.id, answers2[0].id); // Pizza
    }
    for (let i = 3; i < 6; i++) {
      voteRepository.create(users[i].id, poll2.id, answers2[1].id); // Pasta
    }
    for (let i = 6; i < 10; i++) {
      voteRepository.create(users[i].id, poll2.id, answers2[2].id); // Salad
    }

    // Cross-reference: How did Pizza voters vote on the color poll?
    const pizzaVotersOnColor = voteRepository.getCrossReferencedVotes(
      poll1.id,
      poll2.id,
      answers2[0].id // Pizza
    );

    // All Pizza voters voted for Red
    expect(pizzaVotersOnColor[answers1[0].id]).toBe(3); // Red
    expect(pizzaVotersOnColor[answers1[1].id]).toBeUndefined(); // Blue

    // Cross-reference: How did Salad voters vote on the color poll?
    const saladVotersOnColor = voteRepository.getCrossReferencedVotes(
      poll1.id,
      poll2.id,
      answers2[2].id // Salad
    );

    // All Salad voters voted for Blue
    expect(saladVotersOnColor[answers1[0].id]).toBeUndefined(); // Red
    expect(saladVotersOnColor[answers1[1].id]).toBe(4); // Blue
  });
});
