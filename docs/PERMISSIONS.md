# Role and permission model

Authorization is enforced in two layers:

1. the interface hides or disables actions the signed-in role cannot use;
2. every server action and route verifies the session, membership, and required
   permission before reading or changing restaurant records.

The server never trusts `restaurantId` or `userId` supplied by a form.

| Capability | Owner | Manager | Kitchen | Accountant | Viewer |
| --- | ---: | ---: | ---: | ---: | ---: |
| Manage restaurant and team | Yes | No | No | No | No |
| Delete records | Yes | No | No | No | No |
| Manage ingredients, recipes, and menu | Yes | Yes | Read | Read menu/ingredients | Read |
| Record purchases | Yes | Yes | No | Yes | No |
| Record sales | Yes | Yes | No | No | No |
| Record stock usage and waste | Yes | Yes | Yes | No | No |
| Record expenses | Yes | No | No | Yes | No |
| View reports | Yes | Yes | No | Yes | Yes |
| View financial reports and export | Yes | No | No | Yes | No |

`lib/permissions.ts` is the single role matrix. `lib/tenant.ts` resolves a
verified membership before server operations.
