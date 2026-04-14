-- Remove lastName column and add employeeStatus column
ALTER TABLE `employees` 
DROP COLUMN `lastName`,
ADD COLUMN `employeeStatus` varchar(128);