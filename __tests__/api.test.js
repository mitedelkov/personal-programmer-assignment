const fetch = require("cross-fetch");

const URL = "https://graphqlzero.almansi.me/api";

async function gcall(query, variables = undefined) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(variables ? { query, variables } : { query }),
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

describe("GraphQL API Tests", () => {
 
  test("should fetch users with albums", async () => {
    const query = `
      query {
        users(options: { paginate: { page: 1, limit: 2 } }) {
          data {
            id
            name
            albums {
              data { id title }
            }
          }
          meta { totalCount }
        }
      }
    `;
    const { res, body } = await gcall(query);

    expect([200, 304]).toContain(res.status);
    expect(body?.data?.users?.data?.length).toBeGreaterThan(0);
    expect(body.data.users.meta.totalCount).toBeGreaterThan(0);
    expect(body.data.users.data[0]).toHaveProperty("id");
    expect(body.data.users.data[0]).toHaveProperty("name");
  });

  test("should fetch a single user by id and include albums", async () => {
    const query = `
      query($id: ID!) {
        user(id: $id) {
          id
          name
          email
          albums(options: { paginate: { page: 1, limit: 1 } }) {
            data { id title }
          }
        }
      }
    `;
    const { res, body } = await gcall(query, { id: 1 });

    expect(res.status).toBe(200);
    expect(body?.data?.user?.id).toBe("1");
    expect(body.data.user).toHaveProperty("email");
    expect(body.data.user.albums).toHaveProperty("data");
  });

  test("should return null for non-existing user id", async () => {
    const query = `
      query {
        user(id: 999999) {
          id
          name
        }
      }
    `;
    const { res, body } = await gcall(query);

    expect(res.status).toBe(200);
    expect(body?.data?.user?.id).toBeNull();
    expect(body?.data?.user?.name).toBeNull();
  });

  test("should simulate createUser mutation", async () => {
    const mutation = `
      mutation($input: CreateUserInput!) {
        createUser(input: $input) {
          id
          name
          username
          email
        }
      }
    `;
    const variables = {
      input: {
        name: "Test User",
        username: "testuser_" + Date.now(),
        email: `test_${Date.now()}@example.com`,
      },
    };

    const { res, body } = await gcall(mutation, variables);

    expect(res.status).toBe(200);
    expect(body?.data?.createUser).toBeDefined();
    expect(body.data.createUser).toHaveProperty("id");
    expect(body.data.createUser.name).toBe(variables.input.name);
    expect(body.data.createUser.email).toBe(variables.input.email);
  });

  test("should simulate updateUser mutation", async () => {
    const mutation = `
      mutation {
        updateUser(id: 1, input: { name: "Updated Name QA" }) {
          id
          name
        }
      }
    `;
    const { res, body } = await gcall(mutation);

    expect(res.status).toBe(200);
    expect(body?.data?.updateUser?.id).toBe("1");
    expect(body.data.updateUser.name).toBe("Updated Name QA");
  });

  test("should simulate deleteUser mutation", async () => {
    const mutation = `
      mutation {
        deleteUser(id: 1)
      }
    `;
    const { res, body } = await gcall(mutation);

    expect(res.status).toBe(200);
    expect(typeof body?.data?.deleteUser).toBe("boolean");
  });

  test("should fetch a single album by id", async () => {
    const query = `
      query {
        album(id: 1) {
          id
          title
          user { id name }
        }
      }
    `;
    const { res, body } = await gcall(query);

    expect(res.status).toBe(200);
    expect(body?.data?.album?.id).toBe("1");
    expect(body.data.album).toHaveProperty("title");
    expect(body.data.album.user).toHaveProperty("id");
  });

  test("should create an album for a user", async () => {
    const mutation = `
      mutation($input: CreateAlbumInput!) {
        createAlbum(input: $input) {
          id
          title
          user { id }
        }
      }
    `;
    const variables = { input: { title: "QA Album " + Date.now(), userId: 1 } };

    const { res, body } = await gcall(mutation, variables);

    expect(res.status).toBe(200);
    expect(body?.data?.createAlbum?.title).toBe(variables.input.title);
    expect(body.data.createAlbum.user.id).toBe("1");
  });

  test("should return GraphQL error for invalid field", async () => {
    const badQuery = `
      query {
        users {
          data {
            id
            name
            nonExistingField
          }
        }
      }
    `;
    const { res, body } = await gcall(badQuery);

    expect([200, 400]).toContain(res.status);
    expect(body.errors).toBeDefined();
    const msg = body.errors?.[0]?.message || "";
    expect(msg.toLowerCase()).toContain("cannot query field");
  });

  test("should handle wrong argument type by returning null fields", async () => {
  const badType = `
    query {
      user(id: "not-a-number") {
        id
        name
      }
    }
  `;
  const { res, body } = await gcall(badType);

  expect(res.status).toBe(200);
  expect(body?.data?.user?.id).toBeNull();
  expect(body?.data?.user?.name).toBeNull();
});
});
