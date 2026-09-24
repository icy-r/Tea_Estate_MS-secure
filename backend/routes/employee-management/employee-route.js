import { Router } from "express";
import * as EmployeeController  from "../../controllers/employee-management/employee-controller.js";
import {checkAuth, decodeUserFromToken, requireRole, MANAGERS} from "../../middleware/auth-mid.js";



const router = Router();

/*---------- Public Routes ----------*/


/*---------- Protected Routes ----------*/
router.use(decodeUserFromToken, checkAuth)
// index for getting all machines defined in EmployeeController
// Staff records (salary, NIC, address) are visible to managers and supervisors only
router.get("/", requireRole(...MANAGERS, "Supervisor"), EmployeeController.index);

// show for getting a single machine defined in EmployeeController
router.get("/:id", EmployeeController.show);

// create for creating a new machine defined in EmployeeController
router.post("/", requireRole("Employee Manager"), EmployeeController.create);

// update for updating a machine defined in EmployeeController
router.put("/:id", EmployeeController.update);

// destroy for deleting a machine defined in EmployeeController
router.delete("/:id", requireRole("Employee Manager"), EmployeeController.destroy);

// harvest
router.post("/update-ot", requireRole("Employee Manager", "Field Manager"), EmployeeController.updateOT);


export { router };

