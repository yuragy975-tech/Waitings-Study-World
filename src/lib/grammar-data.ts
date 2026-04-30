export type GrammarTopic = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  {
    id: "sentence-components",
    title: "句子成分",
    description: "谓语·系动词·表语·定语·状语",
    icon: "🧱",
  },
  {
    id: "compound-sentences",
    title: "简单句与并列句",
    description: "FANBOYS连词与句子连接规则",
    icon: "🔗",
  },
  {
    id: "adverbial-clauses",
    title: "状语从句",
    description: "时间·原因·目的·结果·条件·让步",
    icon: "⏰",
  },
  {
    id: "noun-clauses",
    title: "名词性从句",
    description: "主语从句·宾语从句·表语从句·同位语从句",
    icon: "📦",
  },
  {
    id: "relative-clauses",
    title: "定语从句",
    description: "限定性·非限定性·which的两种用法",
    icon: "🔍",
  },
  {
    id: "non-finite-verbs",
    title: "非谓语动词",
    description: "to do·doing·done与逻辑主语",
    icon: "⚡",
  },
  {
    id: "tenses",
    title: "时态",
    description: "一般过去时·现在完成时·过去完成时",
    icon: "⏳",
  },
  {
    id: "writing-tips",
    title: "写作技巧",
    description: "系动词匹配·连接词·标点规则",
    icon: "✍️",
  },
];

export const GRAMMAR_CONTENT: Record<string, string> = {
  "sentence-components": `【句子成分】

1. 谓语
排除法：只要一句话里的动词满足下面这3种情况中任意一种，那这个动词就不是谓语：
① 动词前面有个to → to take
② 动词加了ing，且前边没有be动词 → students studying at home
③ 动词过去分词，翻译成被动，且前边没有be动词 → animals killed by people

例句：
- The Chinese government wants to find new ways to tackle this problem.
- Seeing something in person allows us to notice details.
- History written by winners contains bias.

2. 系动词
第一类：翻译成"是"的be动词（am/are/is/was/were）
第二类：表变化的系动词，如 become, grow, turn, get
- Our society becomes multicultural.
- He got bald in his twenties.
- The weather turns cold.
注意区分：Where did you get that car?（这里get不是系动词）

3. 表语
定义：紧挨着系动词之后，用来说明主语的成分。
- She is a girl. → a girl 是表语
- The weather turns cold. → cold 是表语

4. 定语
定义：修饰名词的成分叫定语。通常由名词、形容词、介词短语来充当。
使用原则："前短后长，就近原则"
- 前短：定语很短（一个单词），放在名词前面 → social media
- 后长：定语较长（词组/短语），放在名词后面 → the gap between rich and poor
错误：Fruits provide people with essential nutrients like peach, pineapple, etc.
正确：Fruits like peach and pineapple provide people with essential nutrients.

5. 状语
定义：通常修饰动词、句子、形容词、副词的成分。通常由副词、介词短语来充当。
- work remotely（副词修饰动词）
- In modern society, fashion is becoming more highly valued.（介词短语修饰句子）
关键区分：
- 名词/形容词 → 可作定语，不可作状语
- 副词 → 可作状语，不可作定语
- 介词短语 → 既可作定语，又可作状语
错误：treated different → 正确：treated differently`,

  "compound-sentences": `【简单句与并列复杂句】

一、简单句
定义：只有一套主谓结构的句子。
By simply entering an Internet website, you can place an order for almost anything from cheesecakes to fully equipped desktop computers.

二、复杂句
由两套及以上的简单句组成，分两类：
- 并列复杂句：由并列连词连接
- 从句：由从属连词连接

并列连词：可以连接词、短语、句子
从属连词：只能连接从句

三、7种并列连词（FANBOYS）
For, And, Nor, But, Or, Yet, So

For: He found it more difficult to read, for his eyesight was beginning to fail.
And: I missed supper, and I am hungry.
Nor: I do not know why he cries, nor do I want to know.
But: It's an old car, but it's very reliable.
Or: You can go out to the cinema, or you can just stay at home.
Yet: Joker is a criminal, yet many people admire him.
So: I moved to a new city, so I got a new apartment.

注意：for 和 so 后边只能接句子；其余五个既可以连接词也可以连接句子。

四、连词和谓语的个数关系
N个谓语 → 需要恰好 N-1 个连词
- 1个谓语 → 0个连词
- 2个谓语 → 1个连词
- 3个谓语 → 2个连词

重要规则：逗号不可以连接谓语，也不可以连接句子！
错误：When people are fearful of punishment, they will comply with laws, the rate of crimes will fall down.`,

  "adverbial-clauses": `【状语从句】

定义：一句话充当状语的从句。
I will go to the shop in an hour.（介词短语作状语）
I will go to the shop when I finish my homework.（从句作状语）

连词是判断状语从句类型的重要依据：

1. 时间状语从句
常见：when, after, before, since(自从), until, while(当...时候)
- When there are hundreds of applicants chasing a vacancy, a recognized qualification is an easy way for employers to make the choice.

2. 原因状语从句
常见：because, as
- As the lives of all creatures should be respected, we have no right to subject animals to this kind of trauma.

3. 目的状语从句
常见：so that(目的是), in order that
- Laboratory mice are usually given an illness so that the effectiveness of a new drug can be testified.

4. 结果状语从句
常见：so...that, such...that, so that(结果)
- The eruption was so fierce that the dust darkened the sky.
- Children are surrounded by too many tempting objects so that they are not able to focus.

5. 条件状语从句
常见：if, once
- If parents could raise their children to be considerate of others, the whole community would benefit.

6. 让步状语从句
常见：although, while, even if/though
- While animal experiments might be morally wrong, it is a necessary evil.
- Although we may appear not to rely on one another on the surface, we are heavily depending on the technologies and skills that others have perfected on a deeper level.`,

  "noun-clauses": `【名词性从句】

本质：用三种句子充当四种成分。

一、四种名词性从句

1. 宾语从句（放在动词/介词之后）
I do not know that he will cry.
I do not know whether he will cry.
I do not know why he cries.

2. 主语从句（放在句首）
That the earth is round has been known for years.
Whether the earth is round has been known for years.

3. 表语从句（放在be动词之后）
My idea is that people will live on the moon someday.
My question is whether people will live on the moon someday.

4. 同位语从句（放在抽象名词之后，解释该名词）
There is a common belief that students can become independent learners.
The question whether the nation needs opera is seldom addressed.
注意：抽象名词包括 argument, belief, conclusion, fact, idea, news, opinion, problem, question, theory, view 等。

二、连词的规则
- 从句是陈述句 → 用 that（无实际含义）
- 从句是一般疑问句 → 用 whether/if（有含义）
- 从句是特殊疑问句 → 用特殊疑问词 when/where/why/how/who/what/which/whose

三、补丁知识

1. it引导的主语从句：当主语从句过长时，用it作形式主语，从句放句尾。
It is important that you take better care of yourself.
= That you take better care of yourself is important.

2. 连词省略：宾语从句由that引导，且放在动词之后，that常可省略。其他情况不建议省略。
I believe (that) I can fly. ✓
My idea is that people will live on the moon someday. （that不能省）`,

  "relative-clauses": `【定语从句】

一、定语从句连词的特点
who, which, that, when, where — 兼具代词/副词功能。

- 被修饰词在从句中作主语/宾语 → 用 who, which 或 that
  Most people consider children who have many toys to be the fortunate ones.
  We are going to the beach which I like best.

- 被修饰词在从句中作状语 → 用 when, where
  My grandmother remembers the days when there were no personal computers.
  This is the classroom where we met each other.

二、,which 引导的定语从句（两种用法）
① 指代前面就近的名词：
Bottles are converted into glass, which is then mixed with hot water.
② 指代前面的整个句子：
He was little tense in the presence of so many people, which was understandable.

三、限定性 vs 非限定性定语从句
区别：有无逗号隔开。
- The boss fired all the workers who were late.（只解雇迟到的）
- The boss fired all the workers, who were late.（全部解雇，他们都迟到了）

- She has a son who serves in the military.（她有一个当兵的儿子，可能还有其他儿子）
- She has a son, who serves in the military.（她有一个儿子，他在当兵）

四、连词的省略
定语从句中，被修饰的名词在从句中作宾语时，常可省略连词：
I can't find the book (that) I bought last month.
Tasks (which) people once had to do on their own can be completed by specialists.`,

  "non-finite-verbs": `【非谓语动词】

一、什么是非谓语动词
不是谓语的动词就是非谓语动词，三种形式：to do, doing, done

判断方法：
① 动词前面有 to → to do 不定式
② 动词加了 ing，且前边没有be动词 → doing
③ 动词过去分词，翻译成被动，且前边没有be动词 → done

例句：
- Consuming too much junk food negatively influences health.（doing作主语）
- To punish a very young child is both wrong and foolish.（to do作主语）
- Attaining speeds of up to 60 miles per hour, cheetahs are perhaps the fastest of land animals.（doing作状语）

二、逻辑主语
非谓语动词作状语时，其逻辑主语（动作的发出者）一般是相邻主句的主语。

错误：By simply entering an Internet website, an order can be placed for almost anything.
（"an order"不能"entering"网站）
正确：By simply entering an Internet website, you can place an order for almost anything.

错误：Comparing to traditional companies..., the Internet is a cheaper platform.
（"the Internet"不能"comparing"）
正确：Compared to traditional companies..., the Internet is a cheaper platform.

三、定语从句与非谓语作定语的转换
条件：被修饰词在从句中作主语，且从句是没有情态动词的肯定句。

转化方法：
- 从句中有be动词 → 去掉连词和be动词
  History which is written by winners → History written by winners
- 从句中无be → 去掉连词，动词加ing
  Students who simply rely on teachers → Students simply relying on teachers`,

  tenses: `【时态】

一、一般过去时
两种用法：
① 描述"过去的具体时间里，发生的动作或事实"
I met my wife in 1983. They got home very late last night.
People lived in caves a long time ago.

② 描述与现实相反的过去的动作或事实
She used to go to work by bus.
I lived abroad for ten years.

二、现在完成时
三种情况：
① 迄今为止，某个动作已经完成（何时发生不重要）
The police have caught the thief.
Technology has changed how people interact with each other.

② 迄今为止，已经拥有某种经历（何时发生不重要）
I have seen an alien.（强调经历）
对比：I saw an alien last year.（强调具体时间）
Have you ever been to New York?

③ 动作从过去持续到现在（常跟 for, since 连用）
I have worked here since June.
I have waited for you for 5 hours.
I have been in the army for more than 5 years.

三、过去完成时
与现在完成时极其相似，唯一区别：截止到过去的一个时间点。
- People's attitudes towards females have changed.（截止到现在）
- People's attitudes towards females had changed by 1950.（截止到1950年）

- I have seen an alien.（截止到现在的经历）
- I had seen an alien before I became a pilot.（截止到当飞行员之前的经历）

- I have waited for you for 5 hours.（到现在）
- I had waited for 5 hours by the time you came.（到你来的时候）

标志词：until last week, before last year, by the time, by nine o'clock last night`,

  "writing-tips": `【写作技巧】

一、系动词匹配规则
系动词前边的主语和后边的表语必须匹配并且符合常理。
错误：Old people aged 65 and over was 25%.（老人≠25%）
正确：The proportion of old people aged 65 and over was 25%.

错误：Eating too much junk food may become obese easily.
（eating junk food 不能 become obese）

二、连接副词 vs 连词
以下词是连接副词，不是连词，不能连接句子！
however, besides, in addition, moreover, then, therefore, also, for example, in contrast, as a result, thus, meanwhile, on the other hand

错误：Males are usually rational, however, males in this countries are emotional.
正确：Males are usually rational. However, males in this countries are emotional.

三、并列连词标点规则
- 连接两个词 → 不需要逗号：cupcakes and lobster
- 连接句子或三个以上的词 → 需要逗号：
  Henry is an introvert, yet he likes office parties.
  He is tall, dark, and handsome.

四、状语从句标点规则
- 连词在句首 → 主从两句之间需要逗号：
  When lazy students whine, the teacher will throw chalks at their heads.
- 连词在句中 → 不用逗号：
  I will eat my broccoli after I eat this cookie.`,
};
