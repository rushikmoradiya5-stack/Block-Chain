// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmployeeRegistration {
    struct Employee {
        uint id;
        string name;
        string email;
        string position;
    }

    mapping(address => mapping(uint => Employee)) public employees;
    mapping(address => uint) public employeeCount;
    mapping(address => uint[]) public employeeIds;

    event EmployeeRegistered(
        address indexed registrant,
        uint indexed id,
        string name,
        string email,
        string position
    );

    event EmployeeUpdated(
        address indexed registrant,
        uint indexed id,
        string name,
        string email,
        string position
    );

    event EmployeeDeleted(
        address indexed registrant,
        uint indexed id
    );

    function registerEmployee(
        string memory _name,
        string memory _email,
        string memory _position
    ) public {
        employeeCount[msg.sender]++;
        uint newEmployeeId = employeeCount[msg.sender];

        employees[msg.sender][newEmployeeId] = Employee(
            newEmployeeId,
            _name,
            _email,
            _position
        );
        employeeIds[msg.sender].push(newEmployeeId);

        emit EmployeeRegistered(
            msg.sender,
            newEmployeeId,
            _name,
            _email,
            _position
        );
    }

    function updateEmployee(
        uint _id,
        string memory _name,
        string memory _email,
        string memory _position
    ) public {
        require(employees[msg.sender][_id].id != 0, "Employee not found");

        employees[msg.sender][_id].name = _name;
        employees[msg.sender][_id].email = _email;
        employees[msg.sender][_id].position = _position;

        emit EmployeeUpdated(
            msg.sender,
            _id,
            _name,
            _email,
            _position
        );
    }

    function deleteEmployee(uint _id) public {
        require(employees[msg.sender][_id].id != 0, "Employee not found");

        delete employees[msg.sender][_id];

        // Remove from employeeIds array
        uint[] storage ids = employeeIds[msg.sender];
        for (uint i = 0; i < ids.length; i++) {
            if (ids[i] == _id) {
                ids[i] = ids[ids.length - 1];
                ids.pop();
                break;
            }
        }

        emit EmployeeDeleted(msg.sender, _id);
    }

    function getEmployee(uint _id)
        public
        view
        returns (
            uint,
            string memory,
            string memory,
            string memory
        )
    {
        Employee memory emp = employees[msg.sender][_id];
        require(emp.id != 0, "Employee not found");
        return (emp.id, emp.name, emp.email, emp.position);
    }

    function getAllEmployeeIds() public view returns (uint[] memory) {
        return employeeIds[msg.sender];
    }
}
