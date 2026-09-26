const EmployeeRegistration = artifacts.require("EmployeeRegistration");

contract("EmployeeRegistration", (accounts) => {
  const [admin, user1, user2] = accounts;

  it("should deploy contract successfully", async () => {
    const instance = await EmployeeRegistration.deployed();
    assert(instance.address !== "");
  });

  it("should register employee for user1 (User 1)", async () => {
    const instance = await EmployeeRegistration.deployed();

    const tx = await instance.registerEmployee(
      "Alice Johnson",
      "alice@example.com",
      "Software Engineer",
      { from: user1 }
    );

    const event = tx.logs.find((log) => log.event === "EmployeeRegistered");
    assert.ok(event, "EmployeeRegistered event should be emitted");
    assert.equal(event.args.name, "Alice Johnson");
    assert.equal(event.args.position, "Software Engineer");

    const emp = await instance.getEmployee(1, { from: user1 });
    assert.equal(emp[1], "Alice Johnson");
    assert.equal(emp[3], "Software Engineer");
  });

  it("should update employee name and role/position", async () => {
    const instance = await EmployeeRegistration.deployed();

    const tx = await instance.updateEmployee(
      1,
      "Rushik Patel",
      "rushik@example.com",
      "Lead Blockchain Architect",
      { from: user1 }
    );

    const event = tx.logs.find((log) => log.event === "EmployeeUpdated");
    assert.ok(event, "EmployeeUpdated event should be emitted");
    assert.equal(event.args.name, "Rushik Patel");
    assert.equal(event.args.position, "Lead Blockchain Architect");

    const emp = await instance.getEmployee(1, { from: user1 });
    assert.equal(emp[1], "Rushik Patel");
    assert.equal(emp[2], "rushik@example.com");
    assert.equal(emp[3], "Lead Blockchain Architect");
  });

  it("should register a second employee (User 2)", async () => {
    const instance = await EmployeeRegistration.deployed();

    await instance.registerEmployee(
      "Bob Smith",
      "bob@example.com",
      "UI/UX Designer",
      { from: user1 }
    );

    const ids = await instance.getAllEmployeeIds({ from: user1 });
    assert.equal(ids.length, 2);
  });

  it("should delete an employee and remove from list", async () => {
    const instance = await EmployeeRegistration.deployed();

    const tx = await instance.deleteEmployee(1, { from: user1 });
    const event = tx.logs.find((log) => log.event === "EmployeeDeleted");
    assert.ok(event, "EmployeeDeleted event should be emitted");

    const ids = await instance.getAllEmployeeIds({ from: user1 });
    assert.equal(ids.length, 1);
    assert.equal(ids[0].toNumber(), 2);

    // Verify getting deleted employee throws
    try {
      await instance.getEmployee(1, { from: user1 });
      assert.fail("Should have thrown error");
    } catch (err) {
      assert.include(err.message, "Employee not found");
    }
  });
});
