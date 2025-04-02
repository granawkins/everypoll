import Database from 'better-sqlite3';
import { initializeTestDatabase, getRepositories } from '../database';

describe('Database Tests', () => {
  // Hold reference to DB connection for proper cleanup
  let db: Database.Database | null = null;

  beforeEach(() => {
    try {
      // Reset the database for each test
      initializeTestDatabase();

      // Get a connection to use for this test
      const { db: testDb } = getRepositories(true);
      db = testDb;
    } catch (error) {
      console.error('Error in database test setup:', error);
      throw error;
    }
  });

  afterEach(() => {
    try {
      // Close the DB connection after each test
      if (db) {
        db.close();
        db = null;
      }
    } catch (error) {
      console.error('Error in database test cleanup:', error);
    }
  });

  // Ensure cleanup after all tests
  afterAll(() => {
    try {
      if (db) {
        db.close();
      }
    } catch (error) {
      console.error('Error in final database test cleanup:', error);
    }
  });

  describe('User Repository', () => {
    it('should create and retrieve users', () => {
      const { userRepository } = getRepositories(true);

      // Create a user
      const user = userRepository.create('test@example.com', 'Test User');

      // User should have an ID and the provided email and name
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');

      // Retrieve user by ID
      const retrievedUser = userRepository.getById(user.id);
      expect(retrievedUser).toMatchObject(user);

      // Retrieve user by email
      const userByEmail = userRepository.getByEmail('test@example.com');
      expect(userByEmail).toMatchObject(user);
    });

    it('should create anonymous users', () => {
      const { userRepository } = getRepositories(true);

      // Create an anonymous user
      const user = userRepository.createAnonymous();

      // User should have an ID but no email or name
      expect(user.id).toBeDefined();
      expect(user.email).toBeNull();
      expect(user.name).toBeNull();
    });

    it('should update user information', () => {
      const { userRepository } = getRepositories(true);

      // Create a user
      const user = userRepository.create('test@example.com', 'Test User');

      // Update email
      const updatedEmailUser = userRepository.update(
        user.id,
        'updated@example.com'
      );
      expect(updatedEmailUser.email).toBe('updated@example.com');
      expect(updatedEmailUser.name).toBe('Test User');

      // Update name
      const updatedNameUser = userRepository.update(
        user.id,
        undefined,
        'Updated Name'
      );
      expect(updatedNameUser.email).toBe('updated@example.com');
      expect(updatedNameUser.name).toBe('Updated Name');
    });
  });

  describe('Poll Repository', () => {
    it('should create and retrieve polls with answers', () => {
      const { userRepository, pollRepository } = getRepositories(true);

      // Create a user first
      const user = userRepository.create('test@example.com', 'Test User');

      // Create a poll with answers
      const question = 'What is your favorite color?';
      const answerTexts = ['Red', 'Blue', 'Green'];
      const { poll, answers } = pollRepository.create(
        user.id,
        question,
        answerTexts
      );

      // Check poll
      expect(poll.id).toBeDefined();
      expect(poll.author_id).toBe(user.id);
      expect(poll.question).toBe(question);

      // Check answers
      expect(answers.length).toBe(3);
      expect(answers.map((a) => a.text)).toEqual(answerTexts);

      // Retrieve poll
      const retrievedPoll = pollRepository.getById(poll.id);
      expect(retrievedPoll).toMatchObject(poll);

      // Retrieve answers
      const retrievedAnswers = pollRepository.getAnswers(poll.id);
      expect(retrievedAnswers.length).toBe(3);
      expect(retrievedAnswers.map((a) => a.text)).toEqual(answerTexts);
    });

    it('should validate the number of answers', () => {
      const { userRepository, pollRepository } = getRepositories(true);

      // Create a user first
      const user = userRepository.create('test@example.com', 'Test User');

      // Try to create a poll with too few answers
      expect(() => {
        pollRepository.create(user.id, 'Question?', ['Single answer']);
      }).toThrow('Polls must have between 2 and 10 answer options');

      // Try to create a poll with too many answers
      expect(() => {
        pollRepository.create(user.id, 'Question?', [
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          '10',
          '11',
        ]);
      }).toThrow('Polls must have between 2 and 10 answer options');
    });

    it('should get polls by author and paginate results', () => {
      const { userRepository, pollRepository } = getRepositories(true);

      // Create a user
      const user = userRepository.create('test@example.com', 'Test User');

      // Create multiple polls
      for (let i = 1; i <= 15; i++) {
        pollRepository.create(user.id, `Poll ${i}`, ['Option 1', 'Option 2']);
      }

      // Get first page (default 10)
      const firstPage = pollRepository.getByAuthor(user.id);
      expect(firstPage.length).toBe(10);

      // Get second page
      const secondPage = pollRepository.getByAuthor(user.id, 10, 10);
      expect(secondPage.length).toBe(5);

      // Custom limit
      const customLimit = pollRepository.getByAuthor(user.id, 5);
      expect(customLimit.length).toBe(5);
    });
  });

  describe('Vote Repository', () => {
    it('should record votes and count them', () => {
      const { userRepository, pollRepository, voteRepository } =
        getRepositories(true);

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
      const { userRepository, pollRepository, voteRepository } =
        getRepositories(true);

      // Create a user
      const user = userRepository.create('test@example.com', 'Test User');

      // Create a poll
      const { poll, answers } = pollRepository.create(user.id, 'Question?', [
        'Option 1',
        'Option 2',
      ]);

      // First vote should succeed
      voteRepository.create(user.id, poll.id, answers[0].id);

      // Second vote should fail
      expect(() => {
        voteRepository.create(user.id, poll.id, answers[1].id);
      }).toThrow('User has already voted on this poll');

      // Check if user has voted
      expect(voteRepository.hasVoted(user.id, poll.id)).toBe(true);
    });

    it('should support cross-referencing polls', () => {
      const { userRepository, pollRepository, voteRepository } =
        getRepositories(true);

      // Create users
      const users = Array.from({ length: 10 }, (_, i) => {
        return userRepository.create(`user${i}@example.com`, `User ${i}`);
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
});
