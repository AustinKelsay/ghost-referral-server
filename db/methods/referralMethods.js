const prisma = require('../prisma.js');

const createReferral = async (referrerName, referrerEmail, refereeEmail) => {
    try {
        // Check if the referrer already exists
        let referrer = await prisma.referrer.findUnique({
            where: {
                email: referrerEmail
            }
        });

        // If the referrer does not exist, create them
        if (!referrer) {
            referrer = await prisma.referrer.create({
                data: {
                    name: referrerName,
                    email: referrerEmail,
                    referees: {
                        create: {
                            email: refereeEmail
                        }
                    }
                },
                include: {
                    referees: true, // Include the referees in the returned object
                }
            });
        } else {
            try {
                // If the referrer exists, try to add the new referee
                await prisma.referee.create({
                    data: {
                        email: refereeEmail,
                        referrerId: referrer.id
                    }
                });

                // Retrieve the referrer with the updated referees list
                referrer = await prisma.referrer.findUnique({
                    where: {
                        email: referrerEmail
                    },
                    include: {
                        referees: true
                    }
                });
            } catch (error) {
                if (error.code === 'P2002' && error.meta.target.includes('email')) {
                    // Unique constraint violation on the 'email' field
                    // Referee has already been referred by this referrer
                    return { error: 'Referee already exists for this referrer' };
                } else {
                    throw error; // Re-throw other errors
                }
            }
        }

        return referrer;
    } catch (error) {
        console.error('Error creating referral:', error);
        throw error; // Re-throw the error to be caught in the route handler
    }
};

const incrementReferrerSuccessfulReferrals = async (referrerEmail) => {
    try {
      const updatedReferrer = await prisma.referrer.update({
        where: {
          email: referrerEmail,
        },
        data: {
          successfulReferrals: {
            increment: 1,
          },
        },
      });
  
      return updatedReferrer;
    } catch (error) {
      console.error('Error incrementing referrer successful referrals:', error);
      throw error; // Re-throw the error to be caught in the route handler
    }
  };

  const getAllUnrewardedReferees = async () => {
    try {
      const unrewardedReferees = await prisma.referee.findMany({
        where: {
          rewarded: false,
        }
      });
      return unrewardedReferees;
    } catch (error) {
      console.error('Error fetching unrewarded referees:', error);
      throw error; // Re-throw the error to be caught in the route handler
    }
  };

  const getAllUnrewardedReferrers = async () => {
    // where successfulReferrals is 0 and where at least one referee has been rewarded
    try {
      const unrewardedReferrers = await prisma.referrer.findMany({
        where: {
          successfulReferrals: 0,
          referees: {
            some: {
              rewarded: true,
            },
          },
        },
      });
      return unrewardedReferrers;
    } catch (error) {
      console.error('Error fetching unrewarded referrers:', error);
      throw error; // Re-throw the error to be caught in the route handler
    }
  };

const getRefereeRewardStatus = async (refereeEmail) => {
  try {
    const referee = await prisma.referee.findUnique({
      where: {
        email: refereeEmail,
      },
      select: {
        rewarded: true,
      },
    });

    if (!referee) {
      return { error: 'Referee not found' };
    }

    return { rewarded: referee.rewarded };
  } catch (error) {
    console.error('Error fetching referee reward status:', error);
    throw error;
  }
};

const getReferrerRewardStatus = async (referrerEmail, refereeEmail) => {
  try {
    const referrer = await prisma.referrer.findUnique({
      where: {
        email: referrerEmail,
      },
      include: {
        referees: {
          where: {
            email: refereeEmail,
          },
        },
      },
    });

    if (!referrer) {
      return { error: 'Referrer not found' };
    }

    const referee = referrer.referees[0];

    if (!referee) {
      return { error: 'Referee not found for the referrer' };
    }

    return { rewarded: referee.rewarded };
  } catch (error) {
    console.error('Error fetching referrer reward status:', error);
    throw error;
  }
};

const refereeRewarded = async (refereeEmail) => {
  try {
    const referee = await prisma.referee.update({
      where: {
        email: refereeEmail,
      },
      data: {
        rewarded: true,
      },
      select: {
        rewarded: true,
      },
    });

    if (!referee) {
      return { error: 'Referee not found' };
    }

    return { rewarded: referee.rewarded };
  } catch (error) {
    console.error('Error updating referee rewarded status:', error);
    throw error;
  }
};


module.exports = { createReferral, getAllUnrewardedReferees, incrementReferrerSuccessfulReferrals, getRefereeRewardStatus, getReferrerRewardStatus, getAllUnrewardedReferrers, refereeRewarded };