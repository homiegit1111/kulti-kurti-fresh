const { createClerkClient } = require('@clerk/backend');

async function run() {
  const clerk = createClerkClient({ secretKey: 'sk_test_xzom6vW0uB6QJzc6YwvhX8xwO91ZFbW9eAdbMx7Mru' });
  const instance = await clerk.instances.getInstance();
  console.log(instance);
}

run().catch(console.error);
